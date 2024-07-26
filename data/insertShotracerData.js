import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');


async function authenticate() {
    try {
        await pb.admins.authWithPassword('admin@poolimate.de', 'pocketbase');
        console.log('Authentication successful.');
    } catch (error) {
        console.error('Error authenticating:', error);
    }
}

async function insertTimeEntry(deviceId, time) {

    let shotracer = "";

    switch (deviceId) {
        case 1:
            shotracer = "yellow";
            break;
        case 2:
            shotracer = "pink";
            break;
        default:
            console.log("deviceId is invalid");
            return;
    }

    console.log(shotracer, time);

    const records = await pb.collection('shotracer').getFullList({filter: `time=0 && shotracer="${shotracer}"`, sort: '+created'});

    if(records.length === 0){
        console.log("Received signal from ESP but no team is awaiting time");
        return;
    }

    /*if(records.length > 1){
        console.log("More than 1 team is awaiting time from this shotracer, ambiguous");
        return;
    }*/

    const teamAwaitingTime = records[0].id;

    try {
        const data = {
            time: time,
        };

        await pb.collection('shotracer').update(teamAwaitingTime, data);
        console.log(`Added time for team "${teamAwaitingTime}".`);
    } catch (error) {
        console.error('Error adding time:', error);
    }
}

function connectToWebSocket(){
    //const socket = new WebSocket("ws://localhost:8187");
    const socket = new WebSocket("ws://192.168.1.236/ws");

    socket.onopen = function () {
        console.log("Connected to socket");
    };

    socket.onclose = function(e) {
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        setTimeout(function() {
            connectToWebSocket();
        }, 1000);
    };
    socket.onerror = function (err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        setTimeout(function() {
            connectToWebSocket();
        }, 1000);
    };

    socket.onmessage = async function(event){
        console.log(event.data);
        let data = JSON.parse(event.data);
        console.log(data);

        insertTimeEntry(data.deviceId, data.time);

        return;
    };

    return socket;
}


async function main() {

    await authenticate();
    await connectToWebSocket();
}

main().catch((error) => console.error('Error in main function:', error));
