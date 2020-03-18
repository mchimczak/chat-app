//add socket.io script into html file
//add your new js file to html file below socket.io
//your js file has access to functions from socket.io libr

//init func from websocket io libr
const socket = io()

const $chatbox = document.querySelector('#chat')
const $sidebar = document.querySelector('#sidebar')

const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')

const $imgForm = document.querySelector('#img-form')
const $imgFormInput = $imgForm.querySelector('input')
const $imgFormButton = $imgForm.querySelector('button')

const $sendLocationBtn = document.querySelector('#send-location')
const $logoutBtn = document.querySelector('#logout')
const $userTyping = document.querySelector('#typing')

//TEMPLATES 
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML
const imgTemplate = document.querySelector('#img-template').innerHTML

// OPTIONS
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoScroll = () => {
    const $newMessage = $chatbox.lastElementChild
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin
    const visibleHeight = $chatbox.offsetHeight
    const contentContainerHeight = $chatbox.scrollHeight

    const scrollOffset = $chatbox.scrollTop + visibleHeight

    if(contentContainerHeight - newMessageHeight <= scrollOffset) {
        $chatbox.scrollTop = $chatbox.scrollHeight
    }
};

//APPEND TYPING BOX TO THE CHAT


//SOCKET FUNCTIONS

socket.on('message', (message) => {
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        time: moment(message.createdAt).format('hh:mm a')
    });
    $chatbox.insertAdjacentHTML('beforeend', html);
    autoScroll();
});

socket.on('locationMessage', (location) => {
    const html = Mustache.render(locationTemplate, {
        username: location.username,
        url: location.url,
        time: moment(location.createdAt).format('hh:mm a')
    });
    $chatbox.insertAdjacentHTML('beforeend', html);
    autoScroll();
});

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    $sidebar.innerHTML = html;
});

socket.on('userTyping', (msg) => {
    if(msg) {
        $userTyping.innerText = msg.text;
    }
});


socket.on('fileFunc', ([link, user]) => {
    const html = Mustache.render(imgTemplate, {
        link: link.data,
        username: user.username,
        time: moment(user.createdAt).format('hh:mm a')
    });
    $chatbox.insertAdjacentHTML('beforeend', html);
    autoScroll();
    checkForImages();
});

socket.on('displayPhoto', ([link, user]) => {
    const html = Mustache.render(imgTemplate, {
        link,
        username: user.username,
        time: moment(user.createdAt).format('hh:mm a')
    });
    $chatbox.insertAdjacentHTML('beforeend', html);
    autoScroll();
    checkForImages();
});



// EVENTS
document.querySelector('.pics').addEventListener('click', () => {
    $imgFormInput.click()
});
$imgForm.addEventListener('change', (e) => {
    const count = $imgFormInput.files.length;
    count > 1 ? $imgFormButton.innerText = `Send ${count} images` : $imgFormButton.innerText = `Send ${count} image`;
    
    if(count >= 1) {
        $imgFormButton.disabled = false
    }
});
$imgForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const files = e.target.elements.imgInput.files;
    const fileParts = Object.keys(files).map((key) => files[key]);
    const singleFile = fileParts.forEach( part => {
        function getBase64(file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function() {
            socket.emit('sendFile', { data: reader.result });
            };
        reader.onerror = function(err) {
            console.log('error', err)
            };
        };

    getBase64(part);
    });

    e.target.elements.imgInput.value = '';
    $imgFormButton.innerText = 'Send Image';
    $imgFormButton.disabled = true;

});
document.querySelector('.msg').addEventListener('click', () => {
    $messageFormButton.click();
});
$messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = e.target.elements.msgInput.value;
        $messageFormButton.setAttribute('disabled', 'disabled');

        //when the message is recived use callback as acknowladge
        socket.emit("sendMessage", message, (messageConfirmed) => {
            $messageFormButton.removeAttribute('disabled')
            $messageFormInput.value = ''
            $messageFormInput.focus()
        });
});
$sendLocationBtn.addEventListener('click', () => {
    if(!navigator.geolocation){
        return alert('Your browser dont support geolocation');
    }
    $sendLocationBtn.setAttribute('disabled', 'disabled');
    navigator.geolocation.getCurrentPosition(position => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            $sendLocationBtn.removeAttribute('disabled')
            console.log('Location shared')
        })
    });
});
const clearbox = document.querySelector('#clearbox').addEventListener('click', () => {
    $chatbox.innerHTML = '';
});
$logoutBtn.addEventListener('click', () => {
    socket.emit('logout');
    location.href = '/';
});
$messageFormInput.addEventListener('keypress', function() {
        if(this.value.length >= 1) {
            socket.emit('typingMessage', (`${username} is typing...`));
        }
});
$messageFormInput.addEventListener('blur', function() {
    socket.emit('typingMessage', '');
});


socket.emit('join', { username, room }, (error) => {
    if(error) {
        alert(error)
        location.href = '/'
    }
});

//ENLARGE CLICKED PHOTO
const checkForImages = () => {
    let postImages = document.querySelectorAll('.newImg');
    postImages.forEach( el => {
        el.addEventListener('click', () => el.classList.toggle('open'))
    });
};

// SETS PROPER VH UNITS
window.addEventListener('resize', () => {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`)
})



// CAPTURE PIC FROM USER CAMERA
const $camera = document.querySelector('.video');
const $canvas = document.querySelector('.photo');
const ctx = $canvas.getContext('2d');
const $snapShot = document.querySelector('.snapshot');
const $leaveIcon = document.querySelector('.leave');
getVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false})
        .then(localMediaStream => {
            $camera.srcObject = localMediaStream;
            $camera.play();
        })
        .catch(err => {
            console.log(err)
        })
};

videoToCanvas = () => {
    const width = $camera.videoWidth;
    const height = $camera.videoHeight;
    $canvas.width = width;
    $canvas.height = height

    return setInterval(() => {
        ctx.drawImage($camera, 0, 0, width, height)
    }, 30);
};

takePhoto = () => {
    const data = $canvas.toDataURL('image/jpeg')
    socket.emit('takePhoto', data)
};

stopStreamedVideo = (videoElem) => {
    let stream = videoElem.srcObject;
    let tracks = stream.getTracks();
  
    tracks.forEach(function(track) {
      track.stop();
    });
  
    videoElem.srcObject = null;
};

$camera.addEventListener('canplay', videoToCanvas);

const $photoIcon = document.querySelector('.photoIcon').addEventListener('click', async () => {
    const elements = [$camera, $snapShot, $leaveIcon]
    await elements.forEach(el => {
        el.classList.add('active')
    });
    getVideo();
});

$leaveIcon.addEventListener('click', async () => {
    const elements = [$camera, $snapShot, $leaveIcon]
    await stopStreamedVideo($camera)
    elements.forEach(el => {
        el.classList.remove('active')
    });
});

$snapShot.addEventListener('click', async () => {
    const elements = [$camera, $snapShot, $leaveIcon]
    await takePhoto();
    await stopStreamedVideo($camera)
    elements.forEach(el => {
        el.classList.remove('active')
    });
});
