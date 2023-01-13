"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const https = require("https");
const mongodb_1 = require("mongodb");
const WebSocket = require("ws");
const fs = require('fs');
// Express
const app = express();
var cert = fs.readFileSync('/etc/letsencrypt/live/nerisma.fr/fullchain.pem');
var key = fs.readFileSync('/etc/letsencrypt/live/nerisma.fr/privkey.pem');
var options = {
    key: key,
    cert: cert,
};
//initialize a simple http server
const server = https.createServer(options, app);
//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });
// Paramètres
let maxClick;
let step;
// Mongo
const mongoUrl = `mongodb+srv://nerisma:iWr6dYDqDubmBf1t@reveal.msde73g.mongodb.net/?retryWrites=true&w=majority`;
const mongo = new mongodb_1.MongoClient(mongoUrl);
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Cnnection à mongo
            const db = mongo.db('reveal');
            const paramsCol = db.collection('parameters');
            const progressCol = db.collection('progress');
            const emailsCol = db.collection('emails');
            const paramsEnr = yield paramsCol.findOne();
            if (paramsEnr) {
                maxClick = paramsEnr.maxClicks;
                step = 1 / maxClick;
                console.log('Paramètres récupérés', maxClick);
            }
            else {
                console.error('Impossible de récupérer les paramètres');
            }
            // Création de la socket
            wss.on('connection', (ws) => __awaiter(this, void 0, void 0, function* () {
                // Récupération du progrès
                let progressEnr = yield progressCol.findOne();
                if (progressEnr) {
                    console.log('Progrès récupérés', progressEnr.value);
                }
                else {
                    console.error('Impossible de récupérer les progrès');
                }
                // A la reception d'un message
                ws.on('message', () => __awaiter(this, void 0, void 0, function* () {
                    progressEnr = yield progressCol.findOne();
                    if (progressEnr) {
                        console.log('Progrès récupérés', progressEnr.value);
                    }
                    else {
                        console.error('Impossible de récupérer les progrès');
                        return;
                    }
                    progressEnr.value = progressEnr.value - step;
                    if (progressEnr.value <= 0)
                        progressEnr.value = 0;
                    progressCol.updateOne({}, {
                        $set: {
                            value: progressEnr.value
                        }
                    });
                    console.log(progressEnr.value);
                    ws.send(progressEnr.value);
                }));
                //send immediatly a feedback to the incoming connection    
                ws.send(progressEnr.value);
            }));
            //start our server
            server.listen(process.env.PORT || 20000, () => {
                console.log(`Server started on port ${process.env.PORT || 20000} :)`);
            });
        }
        catch (ex) {
            console.error('Un problème est survenu', ex);
            mongo.close();
        }
    });
}
run().catch(console.dir);
//# sourceMappingURL=server.js.map