import * as exports from './face-api.js'
Object.entries(exports).forEach(([name, exported]) => window[name] = exported);

async function face() {

    const MODEL_URL = './models'

    await faceapi.loadSsdMobilenetv1Model(MODEL_URL)
    await faceapi.loadFaceLandmarkModel(MODEL_URL)
    await faceapi.loadFaceRecognitionModel(MODEL_URL)
    await faceapi.loadFaceExpressionModel(MODEL_URL)

    const video = document.querySelector("#video")
    const labels = ['aarav']
    const labeledFaceDescriptors = await Promise.all(
        labels.map(async label => {

            const imgUrl = `images/${label}.png`
            const img = await faceapi.fetchImage(imgUrl)

            const faceDescription = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()

            if (!faceDescription) {
                throw new Error(`no faces detected for ${label}`)
            }

            const faceDescriptors = [faceDescription.descriptor]
            return new faceapi.LabeledFaceDescriptors(label, faceDescriptors)
        })
    );

    const threshold = 0.6

    setInterval(async () => {
        let faceDescriptions = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors()
        console.log(faceDescriptions)

        const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, threshold)

        const results = faceDescriptions.map(fd => faceMatcher.findBestMatch(fd.descriptor))

        if (results.length < 1){
            document.querySelector("body").style.backgroundColor = "black"
        }

        results.forEach((bestMatch) => {
            const text = bestMatch._label
            if (text != "unknown") {
                document.querySelector("body").style.backgroundColor = "#00ff66"
                console.log("Allowed")
            } else {
                document.querySelector("body").style.backgroundColor = "black"
            }
        })
    }, 1000)


}

setInterval(() => {
    if (window.innerHeight < window.innerWidth){
        document.querySelector("#style").innerHTML = "height: 100% !important; width: auto !important"
    }
    else if (window.innerHeight > window.innerWidth){
        document.querySelector("#style").innerHTML = "height: auto !important; width: 100% !important"
    }
}, 1000)

screen.orientation.lock('landscape');

face()
