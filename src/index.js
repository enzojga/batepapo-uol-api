import express from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import { Db, MongoClient, ObjectId } from 'mongodb';
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

    const { name } = req.body;
    const allParticipants = await db.collection("participants").find().toArray();
    const checkParticipants = allParticipants.filter(p => p.name === name);

    const useScheme = joi.object({ name: joi.string().required().min(1), checkParticipants: joi.array().max(0) });
    const validation = useScheme.validate({ ...req.body, checkParticipants }, { abortEarly: true });


    if (validation.error) {
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

app.get("/messages", async (req, res) => {

    const { user } = req.headers;
    const { limit } = req.query;
    const allMessages = await db.collection("messages").find().toArray();
    const filterMessages = allMessages.filter(m => m.from === user || m.to === user || m.to === "Todos");

    if (limit) {
        const limitedMessages = filterMessages.slice((-limit));
        return res.send(limitedMessages);
    }

    res.send(filterMessages);
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

    const validate = useScheme.validate({ ...req.body, sendUser }, { abortEarly: true });

    if (validate.error) {
        return res.sendStatus(422);
    }

    const { to, text, type } = req.body;

    if(type !== "private_message" && type !== "message"){
        return res.sendStatus(422);
    }

    db.collection('messages').insertOne({
        to,
        text,
        type,
        from,
        time: dayjs().format('HH:mm:ss')
    });

    res.sendStatus(201);
});

app.post("/status", async (req, res) => {

    const { user } = req.headers;

    const useScheme = joi.object({ user: joi.string().required(), objUser: joi.object().required() });
    const objUser = await db.collection("participants").findOne({ name: user });
    const validation = useScheme.validate({ user, objUser }, { abortEarly: true });

    if (validation.error) {
        return res.sendStatus(440);
    }

    const { _id } = objUser;
    const newUser = { ...objUser, lastStatus: Date.now() }
    await db.collection("participants").updateOne({ _id: _id }, { $set: newUser });

    res.sendStatus(200);

});

app.delete("/messages/:id", async (req, res) => {

    const { id } = req.params;
    const { user } = req.headers;

    const idMessage = await db.collection("messages").find({ _id: new ObjectId(id) }).toArray();
    const useScheme = joi.object({ idMessage: joi.array().min(1) });
    const validation = useScheme.validate({ idMessage }, { abortEarly: true });

    if (validation.error) {
        return res.sendStatus(404);
    }

    if (idMessage[0].from !== user) {
        return res.sendStatus(401);
    }

    idMessage.forEach(m => db.collection("messages").deleteOne({ _id: m._id }));
    res.sendStatus(200);
});

async function idleUsersRemover() {
    const allParticipants = await db.collection("participants").find().toArray();
    if (allParticipants.length > 0) {
        const iddleParticipants = allParticipants.filter(p => Date.now() - p.lastStatus > 10_000);
        iddleParticipants.forEach(p => {
            db.collection("messages").insertOne({
                from: p.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs().format('HH:mm:ss')
            });
            db.collection("participants").deleteOne({ _id: p._id });
        });
    }
}

setInterval(idleUsersRemover, 15_000);

app.listen(5000, () => console.log('Ouvindo porta 5000'));