import React from 'react';
import './App.css';
import {Card, Container, Image, Navbar} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as tf from '@tensorflow/tfjs';
import Recorder from 'recorder-js';
// import '@mohayonao/web-audio-api-shim';

const MODEL_PATH = '/models/model.json';

class App extends React.Component {

    constructor(props) {
        super(props);
        this.audioData = null;
        this.state = {
            heartState: 0,
            information: 'Press button to start',
            audio: null,
            startButtonText: 'Visualization of Heart Sound'
        };
        this.timer = null;
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.audioContext = null;
        this.heartDetectArray = null;
        this.hsSTFT = null;
        this.model = null;
        this.prediction = null;
        this.gumStream = null;

        // if numOfHeartSound > 1, switch to Stage 2, and set numOfNoise to 0
        // if numOfNoise > 1, switch to Stage 1, and set numOfHeartSound to 0
        // if captureTimer > 9, switch to Stage 3, and set numOfNoise and numOfHeartSound to 0
        // As long as in the Stage 2, captureTimer + 1 per second

        this.numOfHeartSound = 0;
        this.numOfNoise = 0;
        this.captureTimer = 0;
    }

    async componentDidMount() {
        console.log('component did mount');
        this.model = await tf.loadLayersModel(MODEL_PATH);
    }

    // This function initialise recorder for heart sound recognition
    async initMic() {
        console.log('init the mic, keep listening to detect heart sound || Stage 0 => 1');
        this.audioContext =  new (window.AudioContext || window.webkitAudioContext)();
        // This recorder is for heart sound recognition
        this.recorder = new Recorder(this.audioContext, {
            numChannels:1
        });
        let that = this;
        await navigator.mediaDevices.getUserMedia({audio: true})
            .then(
                function(stream) {
                    that.recorder.init(stream);
                    that.gumStream = stream;
                }
            )
            .catch(err => console.log('Uh oh... unable to get stream...', err))

        await this.startListening().then(
            this.timer = setInterval( () =>
                this.pauseAndStartListening(), 1000 )
        )

        this.setState({
            heartState: 1,
            information: 'Searching for heart sound ...'
        });
    }

    async startListening() {
        await this.recorder.start();
    }

    async pauseAndStartListening() {
        await this.recorder.stop()
            .then(({blob, buffer}) => {
                const downSampledArray = this.downSample(tf.buffer([buffer[0].length], 'float32', buffer[0]).toTensor().arraySync(), 1000);
                this.heartDetectArray = this.cropAndPad(downSampledArray);
                this.hsSTFT = this.signal2stft(this.heartDetectArray);
                this.prediction = this.doPrediction(this.hsSTFT);

                if (this.captureTimer > 10) {
                    this.stopRecording();
                }

                if (this.state.heartState === 2) {
                    this.setState({
                        information: 'Hold for ' + (10 - this.captureTimer) + ' seconds'
                    });
                    this.captureTimer = this.captureTimer + 1;
                }

                if (this.prediction.arraySync()[0] > 0.5) {
                    this.numOfNoise = 0;
                    if (this.numOfHeartSound >= 1) {
                        this.startRecording();
                    } else {
                        this.numOfHeartSound = this.numOfHeartSound + 1;
                    }
                } else {
                    this.numOfHeartSound = 0;
                    if (this.numOfNoise >= 1) {
                        this.captureTimer = 0;
                        this.setState({
                            heartState: 1,
                            information: 'Searching for heart sound ...'
                        });
                    } else {
                        this.numOfNoise = this.numOfNoise + 1;
                    }
                }

                console.log('1-sec signal recorded, processed and predicted.', this.prediction.arraySync()[0]);
                this.setState({
                    startButtonText: this.prediction.arraySync()[0]
                })

            }).then(await this.recorder.start())
    }

    downSample(array, sr) {
        const sampleRate = this.audioContext.sampleRate;
        const mod = Math.round( sampleRate / sr );
        let result = [];
        for (let i = 0; i < array.length; i++) {
            if ( (i % mod) === 0 ) {
                result.push(array[i])
            }
        }
        return result
    }

    cropAndPad(array) {
        if (array.length === 1000) {
            return array
        } else if (array.length < 1000) {
            let newArray = [];
            for (let i = 0; i < array.length; i++) {
                newArray.push(array[i]);
            }
            for (let j = array.length; j < 1000; j++) {
                newArray.push(0);
            }
            return new Float32Array(newArray)
        } else {
            return array.slice(0, 1000)
        }
    }

    signal2stft(array) {
        const input = tf.tensor1d(array);
        const stftTensor = tf.signal.stft(input, 200, 100, 200);
        const result = tf.transpose(tf.abs(stftTensor))
        return result

    }

    doPrediction(tensor) {
        let standardTensor = this.doStandardization(tensor);
        standardTensor = standardTensor.reshape([1, standardTensor.shape[0], standardTensor.shape[1], 1]);
        const output = this.model.predict(standardTensor);
        output.print();
        return output
    }

    doStandardization(tensor) {
        const matrix = tensor.transpose().arraySync();
        let newMatrix = [];
        let that = this;
        matrix.forEach(function(row) {
            const mean_ = that.calculateMean(row);
            const std_ = that.calculateStDeviation(row);
            let newRow = row.map(item => (item - mean_)/std_)
            newMatrix.push(newRow)
        });
        return tf.tensor(newMatrix).transpose()
    }
    calculateMean(array){
        return array.reduce(function(a, b){ return a+b; })/array.length;
    }
    calculateStDeviation(array){
        let mean= this.calculateMean(array),
            dev= array.map(function(itm){return (itm-mean)*(itm-mean); });
        return Math.sqrt(dev.reduce(function(a, b){ return a+b; })/array.length);
    }

    async startRecording() {
        // TODO initialise another recorder
        console.log('start recording, to get heart sound data || Stage 1 => 2');
        this.setState({
            heartState: 2,
            startButtonText: 'Visualization of Heart Sound'
        });
        // await this.recorder.stop();
        // this.gumStream.getAudioTracks()[0].stop();
        // clearInterval(this.timer);
        // this.flag = 0;

        // this.flagHeartSound = 0;
        this.numOfNoise = 0;
    }

    async stopRecording() {

        await this.recorder.stop();
        this.gumStream.getAudioTracks()[0].stop();
        clearInterval(this.timer);
        this.numOfHeartSound = 0;
        this.numOfNoise = 0;
        this.captureTimer = 0;

        console.log('stop recording, feed the recorded data to the model || Stage 2 => 3');
        this.setState({
            heartState: 3,
            information: 'Heart sound is captured and being analysed.'
        });
        // TODO feed the tensor to the trained model
    }

    async restart() {
        console.log('restart the workflow || Stage 3 => 0');
        this.setState({
            heartState: 0,
            information: 'Press button to start'
        })
    }

    render() {

        let centerImg;
        if ( this.state.heartState === 0 ) {
            centerImg = <Image className="Img" src="/images/heart-rate-white.png" width="180" height="180" rounded onClick={() => this.initMic()} />;
        } else if ( this.state.heartState === 1  ) {
            centerImg = <Image className="Img" src="/images/heart-rate-black.png" width="180" height="180" rounded onClick={() => this.startRecording()} />;
        } else if ( this.state.heartState === 2  ) {
            centerImg = <Image className="Img" src="/images/heart-rate-red.png" width="180" height="180" rounded onClick={() => this.stopRecording()} />;
        } else if ( this.state.heartState === 3  ) {
            centerImg = <Image className="Img" src="/images/checked.png" width="150" height="150" rounded onClick={() => this.restart()} />;
        }

        let startButton;
        if ( this.state.heartState === 0 ) {
            startButton = <Card className="CardButton" onClick={() => this.initMic()}>START</Card>;
        } else if (this.state.heartState === 3 ) {
            startButton = <Card className="CardButton" onClick={() => this.restart()}>TRY AGAIN</Card>;
        } else if (this.state.heartState === 1 || this.state.heartState === 2 ) {
            startButton =
                <Card className="Card">
                    <Card.Body>
                        {this.state.startButtonText}
                    </Card.Body>
                </Card>;
        }

        return (
            <div className="App">
                <Container>
                    <Navbar className="NavBar" variant="dark">
                        <Navbar.Brand>
                            <img
                                alt=""
                                src="/images/heart-rate.png"
                                width="30"
                                height="30"
                                className="d-inline-block align-top"
                            />{' '}
                            HEARTY HELPER
                        </Navbar.Brand>
                    </Navbar>
                    <Card className="Card">
                        <Card.Body>
                            <Card.Text>
                                { this.state.information }
                            </Card.Text>
                        </Card.Body>
                    </Card>
                    {centerImg}
                    {startButton}
                    <Card className="CardButton">HELP</Card>
                </Container>
            </div>
        );
    }
}

export default App;
