import faceapi from "face-api.js"
import * as canvas from "canvas"
import express from "express"
import '@tensorflow/tfjs-node'
import pkg from "sib-api-v3-sdk"

const { ApiClient, TransactionalEmailsApi, SendSmtpEmail } = pkg
const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
const app = express()
let appReady = true
let labeledFaceDescriptors
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const labels = ["Aarav", "Rahul"]

app.use(express.urlencoded({
    extended: true,
    limit: '1tb'
}))
app.use(express.json({
    limit: '1tb'
}))
app.use("/models", express.static(__dirname));
app.use("/faces", express.static(__dirname));

let defaultClient = ApiClient.instance
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = 'BREVOAPIKEY';
let apiInstance = new TransactionalEmailsApi();
let sendSmtpEmail = new SendSmtpEmail();


let setup = async () => {
    try{
    await faceapi.nets.ssdMobilenetv1.loadFromDisk("./models")
    await faceapi.nets.faceLandmark68Net.loadFromDisk("./models")
    await faceapi.nets.faceRecognitionNet.loadFromDisk("./models")
    await faceapi.nets.faceExpressionNet.loadFromDisk("./models")
    }
    catch (e){
        console.log(e)
    }

    labeledFaceDescriptors = await Promise.all(
        labels.map(async label => {

            const imgUrl = `./faces/${label}.png`
            const img = await canvas.loadImage(imgUrl)

            const faceDescription = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()

            if (!faceDescription) {
                throw new Error(`no faces detected for ${label}`)
            }

            const faceDescriptors = [faceDescription.descriptor]
            return new faceapi.LabeledFaceDescriptors(label, faceDescriptors)
        })
    )
    console.log("loaded")
}

let sendMail = (imgUrl) => {
    email1=""
    email2=""
    email3=""
    sendSmtpEmail.subject = "Security System - Unidentified Person Recognized";
    sendSmtpEmail.htmlContent = `<!doctype html><html lang=en><head><meta charset=UTF-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Mail</title><style>*{text-align:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif}a,a:visited,a:hover,a:active{color:#fff}a{text-decoration:none;color:#fff!important;font-size:23px}button{background-color:#3e38ea;border-radius:50px;padding:15px}</style></head><body><h1>Security System</h1><h1>Unidentifiable Person Detected</h1></body></html>`;
    sendSmtpEmail.sender = { "name": "Security System", "email": email1 };
    sendSmtpEmail.to = [{ "email": email1, "name": "Owner" }, { "email": email2, "name": "Main Security Contact" }, { "email": email3, "name": "Secondary Security Contact" }];

    console.log("sending mail")
    apiInstance.sendTransacEmail(sendSmtpEmail)
}

let face = async (req, res) => {
    const img = await canvas.loadImage(req.body.imgUrl)
    let faceDescriptions = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors().withFaceExpressions()
    const threshold = 0.6
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, threshold)
    const results = faceDescriptions.map(fd => faceMatcher.findBestMatch(fd.descriptor))
    console.log(results)
    let faces = []
    results.forEach((face) => {
        faces.push(face._label)
    })
    let hasAuth = false

    labels.forEach((i) => {
        if (faces.includes(i)){
            hasAuth = true
        }
    })
    if (hasAuth) {
        res.send(true)
    } else{
        sendMail(req.body.imgUrl)
        res.send(false)
    }
}

setup().then(() => {
    appReady = true
})

app.post("/", (req, res) => {
    if (appReady) {
        try {
            face(req, res)
        } catch {
            res.sendStatus(500)
        }
    } else {
        res.sendStatus(503)
  
    }
})

app.listen(8000, () => {
    console.log(`App started: http://127.0.0.1:8000/`)
})