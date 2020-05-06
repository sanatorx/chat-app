const socket = io();

const messageForm = document.getElementById(`chatForm`);
const messageFormMessageInput = document.querySelector(`#chatForm > input[name="message"]`);
const messageFormSubmitButton = document.querySelector(`#chatForm > button[type="submit"]`);
const sendLocationButton = document.getElementById(`send-location`);
const messages = document.getElementById(`messages`);

const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.getElementById(`location-template`).innerHTML;
const sidebarTemplate = document.getElementById(`sidebar-template`).innerHTML;

const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    const newMessage = messages.lastElementChild;

    const newMessageStyles = getComputedStyle(newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = newMessage.offsetHeight + newMessageMargin;

    const visibleHeight = messages.offsetHeight;

    const conatinerHeight = messages.scrollHeight;

    const scrollOffset = messages.scrollTop + visibleHeight;

    if (conatinerHeight - newMessageHeight <= scrollOffset) {
        messages.scrollTop = messages.scrollHeight;
    }
};

socket.on(`message`, (message) => {
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.message,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on(`locationMessage`, locationMessage => {
    const html = Mustache.render(locationTemplate, {
        username: locationMessage.username,
        url: locationMessage.url,
        createdAt: moment(locationMessage.createdAt).format('h:mm a')
    });
    messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});


socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    document.getElementById(`sidebar`).innerHTML = html;
});
messageForm.addEventListener(`submit`, e => {
    e.preventDefault();

    messageFormSubmitButton.setAttribute('disabled', 'disabled');

    socket.emit(`sendMessage`, messageFormMessageInput.value, error => {
        messageFormSubmitButton.removeAttribute('disabled');
        messageFormMessageInput.value = '';
        messageFormMessageInput.focus();
        if (error) return console.log(error);
        console.log('The message was delivered!');
    });
});

sendLocationButton.addEventListener(`click`, () => {
    if (!navigator.geolocation) return alert(`Geolocation is not supported`);

    sendLocationButton.setAttribute('disabled', 'disabled');

    navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        socket.emit(`sendLocation`, { latitude, longitude }, (message) => {
            sendLocationButton.removeAttribute('disabled');
            console.log(message);
        });
    });
});

socket.emit('join', { username, room }, error => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});