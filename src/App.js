import React from 'react';
import './App.css';
import {Card, Container, Image, Navbar} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';


// var heartState = 0;
//
// function changeState() {
//     console.log(heartState)
//     if (heartState === 0) {
//         heartState = 1;
//     } else {
//         heartState = 0;
//     }
// };

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            heartState: 0,
            information: 'Please press the heart below, I can feel your heart.'
        };
    }


    render() {

        const startRecord = () => {
            if (this.state.heartState === 0) {
                this.setState({
                    heartState: 1,
                    information: 'Please put the microphone near to your heart.'
                })
            }
        }

        const heartBeatDetected = () => {
            if (this.state.heartState === 1) {
                this.setState({
                    heartState: 2,
                    information: 'Heart sound detected! Please hold the phone for 9 seconds.'
                })
            }
        }

        const recordingFinished = () => {
            if (this.state.heartState === 2) {
                this.setState({
                    heartState: 0,
                    information: 'Done!'
                })
            }
        }


        let heartRateButton;
        if ( this.state.heartState === 0 ) {
            heartRateButton = <Image className="Img" src="/heart-rate-white.png" width="180" height="180" rounded onClick={() => startRecord()} />;
        } else if ( this.state.heartState === 1  ) {
            heartRateButton = <Image className="Img" src="/heart-rate-black.png" width="180" height="180" rounded onClick={() => heartBeatDetected()} />;
        } else if ( this.state.heartState === 2  ) {
            heartRateButton = <Image className="Img" src="/heart-rate-red.png" width="180" height="180" rounded onClick={() => recordingFinished()} />;
        }

        return (
            <div className="App">
                <Container>
                    <Navbar bg="light" variant="light">
                        <Navbar.Brand>
                            <img
                                alt=""
                                src="/heart-rate.png"
                                width="30"
                                height="30"
                                className="d-inline-block align-top"
                            />{' '}
                            Hearty Helper
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

                    {/*<Image className="Img" src="/heart-rate-white.png" width="180" height="180" rounded />*/}


                    <Card className="Card">
                        <Card.Body>
                            <Card.Text>
                                This part shows the sound wave...
                            </Card.Text>
                        </Card.Body>
                    </Card>

                </Container>
            </div>
        );
    }
}

export default App;
