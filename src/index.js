import express from 'express';
import cors from 'cors';
import dayjs from 'dayjs';

const app = express();
app.use(cors());
app.use(express.json());

const participants = [];
const messages = [];

app.post("/participants", (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.sendStatus(422)
    }
    participants.push({
        name,
        lastStatus: Date.now()
    })
    messages.push({
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dayjs().format('HH:mm:ss')
    });
    res.sendStatus(201);
});

app.get("/participants", (req, res) => {
    res.send(participants);
});

app.get("/messages",(req,res) =>{
    res.send(messages);
})

app.post("/messages",(req,res) =>{
    console.log(req.body)
    const {to,text,type} = req.body;
    const from = req.headers.user;
    console.log(from);
    const sendUser = participants.filter(p => p.name === from);
    console.log(sendUser);
    if(!to || !text){
        return res.sendStatus(422);
    }
    if(type !== 'message' && type !== 'private_message'){
        return res.sendStatus(422);
    }
    if(sendUser.length === 0){
        return res.sendStatus(422);
    }
    messages.push({
        to,
        text,
        type,
    })
    res.sendStatus(201);
})

app.listen(5000, () => console.log('Ouvindo porta 5000'));