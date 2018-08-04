var loginPage = document.querySelector('#login-page'),
    usernameInput = document.querySelector('#username'),
    loginButton = document.querySelector('#login'),
    callPage = document.querySelector('#call-page'),
    theirUsernameInput = document.querySelector('#their-username'),
    callButton = document.querySelector('#call'),
    hangUpButton = document.querySelector('#hang-up'),
    name;
callPage.style.display = "none";

var yourVideo = document.querySelector('#yours'),
    theirVideo = document.querySelector('#theirs'),
    yourConnection, connectedUser, stream;

var socket = io.connect('http://localhost:3000');




socket.on('connect', function () {
    console.log("I am connected");
});

socket.onerror = function (err) {
    console.log("Got error", err);
};

socket.on('login', function (msg) {
    // console.log(" in login msg - ", msg);
    login(msg);
});

socket.on('offer', function (msg) {
    console.log(" in offer msg - ", msg);
    onOffer(msg.offer, msg.name);
});

socket.on('answer', function (msg) {
    console.log(" in answer msg - ", msg);
    onAnswer(msg.answer);
});

socket.on('candidate', function (msg) {
    console.log("on candidate msg - ", msg);
    onCandidate(msg.candidate);
    //break;
});

socket.on('leave', function (msg) {
    console.log("on leave msg - ", msg);
    onLeave();
    //break;
});

send = function (message) {
    socket.emit('message', JSON.stringify(message));
}

loginButton.addEventListener("click", function (event) {
    name = usernameInput.value;
    console.log("name - ", name);
    if (name.length > 0) {
        send({ type: 'login', name: name });
    }
});

function onAnswer(answer) {
    yourConnection.setRemoteDescription(new RTCSessionDescription(answer));
};

function onCandidate(candidate) {
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

function login(msg) {
    console.log("on Login msg - ", msg);
    if (msg.success) {
        console.log("I am loggened - ");
        loginPage.style.display = "none";
        callPage.style.display = "block";
        // Get the plumbing ready for a call
        startConnection();
    } else {
        console.log("logined failed - ");
    }
}


function startConnection() {
    console.log("startConnection - ");
    if (hasUserMedia()) {
        console.log("startConnection - ");
        navigator.getUserMedia({ video: true, audio: true }, function (myStream) {
            console.log("myStream - ", myStream);
            stream = myStream;
            yourVideo.src = window.URL.createObjectURL(stream);

            if (hasRTCPeerConnection()) {
                console.log("startConnection - ");
                setupPeerConnection(stream);
            } else {
                alert("Sorry, your browser does not support WebRTC.");
            }
        }, function (error) {
            console.log(error);
        });
    } else {
        alert("Sorry, your browser does not support WebRTC.");
    }
}

function setupPeerConnection(stream) {
    console.log("startConnection - ");
    var configuration = {
        "iceServers": [{ "url": "stun:127.0.0.1:9876" }]
    };
    yourConnection = new RTCPeerConnection(configuration);

    // Setup stream listening
    yourConnection.addStream(stream);
    console.log("yourConnection.addStream(stream)");
    yourConnection.onaddstream = function (e) {
        console.log("I am in yourConnection.onaddstream", e);
        theirVideo.src = window.URL.createObjectURL(e.stream);
    };

    // Setup ice handling
    yourConnection.onicecandidate = function (event) {
        console.log("yourConnection.onicecandidate");
        if (event.candidate) {
            send({
                type: "candidate",
                candidate: event.candidate,
                name: connectedUser
            });
        }
    };
}

function hasUserMedia() {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    return !!navigator.getUserMedia;
}

function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
    window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
    return !!window.RTCPeerConnection;
}




callButton.addEventListener("click", function () {
    console.log("Call button clicked");
    var theirUsername = theirUsernameInput.value;
    console.log("theirUsername - ", theirUsername);
    if (theirUsername.length > 0) {
        startPeerConnection(theirUsername);
    }
});

function startPeerConnection(user) {
    console.log("startPeerConnection user - ", user);
    connectedUser = user;
    // Begin the offer
    yourConnection.createOffer(function (offer) {
        console.log("yourConnection.createOffer offer - ", offer);
        send({
            type: "offer",
            offer: offer,
            name: user
        });
        yourConnection.setLocalDescription(offer);
    }, function (error) {
        alert("An error has occurred.");
    });
};


function onOffer(offer, name1) {
    console.log("offer offer - ", offer);
    console.log("offer name - ", name1);
    connectedUser = name1;
    yourConnection.setRemoteDescription(new RTCSessionDescription(offer));

    yourConnection.createAnswer(function (answer) {
        yourConnection.setLocalDescription(answer);
        send({
            type: "answer",
            answer: answer,
            name: name1
        });
    }, function (error) {
        alert("An error has occurred");
    });
}


function onAnswer(answer) {
    yourConnection.setRemoteDescription(new RTCSessionDescription(answer));
};

function onCandidate(candidate) {
    yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
};


hangUpButton.addEventListener("click", function () {
    send({
        type: "leave",
        name: connectedUser
    });
    onLeave();
});
function onLeave() {
    connectedUser = null;
    theirVideo.src = null;
    yourConnection.close();
    yourConnection.onicecandidate = null;
    yourConnection.onaddstream = null;
    setupPeerConnection(stream);
};
