import express from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

let db;
const mongoClient = new MongoClient(process.env.MONGO_URI);
mongoClient.connect().then(() => {
    db = mongoClient.db('bate_papo_uol');
});

app.post("/participants", async (req, res) => {

    const allParticipants = await db.collection("participants").find().toArray();
    const checkParticipants = allParticipants.filter(p => p.name === name);

    const useScheme = joi.object({ name: joi.string().required(),checkParticipants: joi.array().max(0) });
    const validation = useScheme.validate(req.body, { abortEarly: true });

    const { name } = req.body;

    if (validation.error) {
        console.log(validation.error.details);
        return res.sendStatus(422)
    }

    db.collection("participants").insertOne({
        name,
        lastStatus: Date.now()
    });
    db.collection("messages").insertOne({
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dayjs().format('HH:mm:ss')
    });
    res.sendStatus(201);
});

app.get("/participants", (req, res) => {
    db.collection("participants").find().toArray().then(p => res.send(p));
});

app.get("/messages", (req, res) => {
    db.collection("messages").find().toArray().then(p => res.send(p));
})

app.post("/messages", async (req, res) => {

    const from = req.headers.user;
    const allParticipants = await db.collection("participants").find().toArray();
    const sendUser = allParticipants.filter(p => p.name === from);

    const useScheme = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().required(),
        sendUser: joi.array().min(1).required()
    });
    const validate = useScheme.validate({...req.body,sendUser}, { abortEarly: true });
    
    if(validate.error){
        return res.sendStatus(422);
    }

    const { to, text, type } = req.body;

    db.collection('messages').insertOne({
        to,
        text,
        type,
        from
    });

    res.sendStatus(201);
})

app.listen(5000, () => console.log('Ouvindo porta 5000'));