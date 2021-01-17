import React from 'react';
import './App.css';
import {Card, Container, Image, Navbar} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import AudioAnalyser from './AudioAnalyser';

// import * as tf from '@tensorflow/tfjs';


class App extends React.Component {

    constructor(props) {
        super(props);
        this.mic = null;
        this.audioData = null;
        this.state = {
            heartState: 0,
            information: 'Please press the heart below, I can feel your heart.',
            audio: null
        };
        // navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    }

    async getMicrophone() {

        try {
            this.audioData = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            // this.setState({ audio });

            // this.mic = await tf.data.microphone({
            //     fftSize: 1024,
            //     columnTruncateLength: 232,
            //     numFramesPerSpectrogram: 43,
            //     sampleRateHz:44100,
            //     includeSpectrogram: true,
            //     includeWaveform: true
            // });
            // this.audioData = await this.mic.capture();


        } catch (e) {
            console.log(e)
        }
    }

    async startMicrophone() {
        this.setState({audio: this.audioData});
    }

    async stopMicrophone() {
        this.state.audio.getTracks().forEach(track => track.stop());
        console.log(this.state.audio);
        this.setState({ audio: null });
    }


    // stopMicrophone() {
    //     this.state.audio.getTracks().forEach(track => track.stop());
    //     this.setState({ audio: null });
    // }


    render() {


        const startRecord = () => {
            if (this.state.heartState === 0) {
                this.getMicrophone().then(r =>
                    this.setState({
                        heartState: 1,
                        information: 'Please put the microphone near to your heart.'
                    })
                )
            }
            restart()
        }

        const heartBeatDetected = () => {
            if (this.state.heartState === 1) {
                this.startMicrophone().then(r =>
                    this.setState({
                        heartState: 2,
                        information: 'Heart sound detected! Please hold the phone for 9 seconds.'
                    })
                )
            }
        }

        const recordingFinished = () => {
            if (this.state.heartState === 2) {
                this.stopMicrophone().then(r => this.setState({
                        heartState: 3,
                        information: 'Done!'
                    })
                )
            }
        }

        const restart = () => {
            if (this.state.heartState === 3) {
                this.setState({
                    heartState: 0,
                    information: 'Please press the heart below, I can feel your heart.'
                })
            }
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
        if ( this.state.heartState === 0 || this.state.heartState === 3 ) {
            startButton = <Card className="CardButton" onClick={() => startRecord()}>START</Card>;
        } else if ( (this.state.heartState === 1 || this.state.heartState === 2 ) && this.state.audio ) {
            startButton =
                <Card className="Card">
                    <Card.Body>
                        <AudioAnalyser audio={this.state.audio} />
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


                    {heartRateButton}

                    {startButton}

                    <Card className="CardButton">HELP</Card>

                </Container>
            </div>
        );
    }
}

export default App;