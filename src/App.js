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
            information: 'stage 0',
            audio: null
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
        this.flag = 0;
    }

    async componentDidMount() {
        console.log('component did mount');
        this.model = await tf.loadLayersModel(MODEL_PATH);
    }

    async initMic() {
        console.log('init the mic, keep listening to detect heart sound || Stage 0 => 1');
        this.audioContext =  new (window.AudioContext || window.webkitAudioContext)();
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
            information: 'Start to listening ...'
        });
    }

    async startListening() {
        await this.recorder.start();
    }

    async pauseAndStartListening() {
        await this.recorder.stop()
            .then(({blob, buffer}) => {
                // TODO here could be a problem, something wired happened when binary buffer turns to the array
                const downSampledArray = this.downSample(tf.buffer([buffer[0].length], 'float32', buffer[0]).toTensor().arraySync(), 1000);
                this.heartDetectArray = this.cropAndPad(downSampledArray);
                this.hsSTFT = this.signal2stft(this.heartDetectArray);
                this.prediction = this.doPrediction(this.hsSTFT);
                if (this.prediction.arraySync()[0] > 0.9) {
                    if (this.flag >= 2) {
                        this.startRecording();
                    } else {
                        this.flag = this.flag + 1;
                    }
                } else {
                    this.flag = 0;
                }
                console.log('1-sec signal recorded, processed and predicted.', this.prediction.arraySync()[0]);
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
            var newArray = [];
            for (var i = 0; i < array.length; i++) {
                newArray.push(array[i]);
            }
            for (var j = array.length; j < 1000; j++) {
                newArray.push(0);
            }
            return new Float32Array(newArray)
        } else {
            return array.slice(0, 1000)
        }
    }

    // The signal2stft works fine
    signal2stft(array) {
        const input = tf.tensor1d(array);
        const stftTensor = tf.signal.stft(input, 256, 128);

        const stftArray = stftTensor.dataSync();
        let conjResult = [];
        let cache = 0;
        for (let i = 0; i < stftArray.length; i++) {
            if (i % 2 === 0) {
                cache = (stftArray[i] * stftArray[i])
            } else {
                conjResult.push(cache + (stftArray[i] * stftArray[i]))
            }
        };
        const conjTensor = tf.tensor(conjResult).reshape([6, 129]);

        return tf.transpose(tf.abs(conjTensor))
    }

    doPrediction(tensor) {
        let standardTensor = this.doStandardization(tensor);
        standardTensor = standardTensor.reshape([1, standardTensor.shape[0], standardTensor.shape[1], 1]);
        const output = this.model.predict(standardTensor);
        output.print();
        return output
    }

    // The Standardization works fine <=
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
        var mean= this.calculateMean(array),
            dev= array.map(function(itm){return (itm-mean)*(itm-mean); });
        return Math.sqrt(dev.reduce(function(a, b){ return a+b; })/array.length);
    }

    async startRecording() {
        console.log('start recording, to get heart sound data || Stage 1 => 2');
        this.setState({
            heartState: 2,
            information: 'Heart sound detected.'
        });
        await this.recorder.stop();
        this.gumStream.getAudioTracks()[0].stop();
        clearInterval(this.timer);
        this.flag = 0;
    }

    async stopRecording() {
        console.log('stop recording, feed the recorded data to the model || Stage 2 => 3');
        this.setState({
            heartState: 3,
            information: 'Heart sound analysed.'
        });
        // TODO feed the tensor to the trained model
    }

    async restart() {
        console.log('restart the workflow || Stage 3 => 0');
        this.setState({
            heartState: 0,
            information: 'stage 0'
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
                        Visualize the heart beat
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
