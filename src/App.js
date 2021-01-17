import React from 'react';
import './App.css';
import {Card, Container, Image, Navbar} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import AudioAnalyser from './AudioAnalyser';
import Recorder from 'recorder-js';

// const audioContext =  new (window.AudioContext || window.webkitAudioContext)();
// const recorder = new Recorder(audioContext, {
//     // An array of 255 Numbers
//     // You can use this to visualize the audio stream
//     // If you use react, check out react-wave-stream
//     onAnalysed: data => console.log(data),
// });
//
// let isRecording = false;
// let blob = null;



class App extends React.Component {

    constructor(props) {
        super(props);
        this.audioData = null;
        this.state = {
            heartState: 0,
            information: 'Please press the heart below, I can feel your heart.',
            audio: null
        };
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.blob = null;
    }

    componentDidMount() {
        const audioContext =  new (window.AudioContext || window.webkitAudioContext)();
        this.recorder = new Recorder(audioContext, {
            numChannels:1
        });
        navigator.mediaDevices.getUserMedia({audio: true})
            .then(stream => this.recorder.init(stream))
            .catch(err => console.log('Uh oh... unable to get stream...', err));
        document.addEventListener('mousedown', () => audioContext.resume());
    }

    startRecording() {
        this.recorder.start()
    }

    stopRecording() {
        this.recorder.stop()
            .then(({blob, buffer}) => {
                // let tmp_blob = blob;
                // var fd = new FormData();
                // fd.append('audio', tmp_blob);

                this.blob = blob;
                console.log(this.blob);

            })
    }

    download() {
        Recorder.download(this.blob, 'my-audio-file'); // downloads a .wav file
    }



    async getMicrophone() {
        try {
            this.audioData = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            this.setState({audio: this.audioData});
        } catch (e) {
            console.log(e)
        }
    }

    async startRecord() {
        // TODO start to record
        console.log('start to record');
        this.startRecording();
    }

    async stopMicrophone() {
        this.state.audio.getTracks().forEach(track => track.stop());
        console.log(this.state.audio);
        this.setState({ audio: null });
        this.stopRecording();
    }



    render() {

        const startRecord = () => {
            this.getMicrophone().then(r =>
                this.setState({
                    heartState: 1,
                    information: 'Please put the microphone near to your heart.'
                })
            )
        }

        const heartBeatDetected = () => {
            this.startRecord().then(r =>
                this.setState({
                    heartState: 2,
                    information: 'Heart sound detected! Please hold the phone for 9 seconds.'
                })
            )

        }

        const recordingFinished = () => {
            this.stopMicrophone().then(r => this.setState({
                    heartState: 3,
                    information: 'Done!'
                })
            )
        }

        const restart = () => {
            this.setState({
                heartState: 0,
                information: 'Please press the heart below, I can feel your heart.'
            })
        }


        let heartRateButton;
        if ( this.state.heartState === 0 ) {
            heartRateButton = <Image className="Img" src="/images/heart-rate-white.png" width="180" height="180" rounded onClick={() => startRecord()} />;
        } else if ( this.state.heartState === 1  ) {
            heartRateButton = <Image className="Img" src="/images/heart-rate-black.png" width="180" height="180" rounded onClick={() => heartBeatDetected()} />;
        } else if ( this.state.heartState === 2  ) {
            heartRateButton = <Image className="Img" src="/images/heart-rate-red.png" width="180" height="180" rounded onClick={() => recordingFinished()} />;
        } else if ( this.state.heartState === 3  ) {
            heartRateButton = <Image className="Img" src="/images/checked.png" width="150" height="150" rounded onClick={() => restart()} />;
        }


        let startButton;
        if ( this.state.heartState === 0 ) {
            startButton = <Card className="CardButton" onClick={() => startRecord()}>START</Card>;
        } else if (this.state.heartState === 3 ) {
            startButton = <Card className="CardButton" onClick={() => restart()}>TRY AGAIN</Card>;
        } else if ( (this.state.heartState === 1 || this.state.heartState === 2 ) && this.state.audio ) {
            startButton =
                <Card className="Card">
                    <Card.Body>
                        <AudioAnalyser audio={this.state.audio} />
                    </Card.Body>
                </Card>;
        }

        let helpButton;
        if (this.state.heartState === 3) {
            helpButton = <Card className="CardButton" onClick={() => this.download()}>Download wav</Card>;
        } else  {
            helpButton = <Card className="CardButton">HELP</Card>;
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


                    {heartRateButton}

                    {startButton}

                    {helpButton}

                </Container>
            </div>
        );
    }
}

export default App;
