import * as express from 'express';
import * as https from 'http';
import { MongoClient } from 'mongodb';
import * as WebSocket from 'ws';

// Express
const app = express();

//initialize a simple http server
const server = https.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

// Paramètres
let maxClick: number;
let step: number;

// Mongo
const mongoUrl = `mongodb+srv://nerisma:iWr6dYDqDubmBf1t@reveal.msde73g.mongodb.net/?retryWrites=true&w=majority`;
const mongo = new MongoClient(mongoUrl);

async function run() {
    try {
        // Cnnection à mongo
        const db = mongo.db('reveal');
        const paramsCol = db.collection('parameters');
        const progressCol = db.collection('progress');
        const emailsCol = db.collection('emails');

        const paramsEnr = await paramsCol.findOne();
        if (paramsEnr) {
            maxClick = paramsEnr.maxClicks;
            step = 1 / maxClick;
            console.log('Paramètres récupérés', maxClick);
        } else {
            console.error('Impossible de récupérer les paramètres');
        }
    

        // Création de la socket
        wss.on('connection', async (ws: WebSocket) => {

            // Récupération du progrès
            let progressEnr = await progressCol.findOne();
            if (progressEnr) {
                console.log('Progrès récupérés', progressEnr.value);
            } else {
                console.error('Impossible de récupérer les progrès');
            }

            // A la reception d'un message
            ws.on('message', async () => {
                progressEnr = await progressCol.findOne();
                if (progressEnr) {
                    console.log('Progrès récupérés', progressEnr.value);
                } else {
                    console.error('Impossible de récupérer les progrès');
                    return;
                }

                progressEnr.value = progressEnr.value - step;
                if (progressEnr.value <= 0) progressEnr.value = 0;

                progressCol.updateOne({}, {
                    $set: {
                        value: progressEnr!.value
                    }
                });

                console.log(progressEnr.value);

                ws.send(progressEnr.value);
            });
        
            //send immediatly a feedback to the incoming connection    
            ws.send(progressEnr!.value);
        });
        
        //start our server
        server.listen(process.env.PORT || 20000, () => {
            console.log(`Server started on port ${process.env.PORT || 20000} :)`);
        });

    } catch (ex) {
        console.error('Un problème est survenu', ex);
        mongo.close();
    }
}

run().catch(console.dir);