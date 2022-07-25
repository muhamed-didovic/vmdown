const createWebsocketMessageListener = (page, client) => {
    const handlers = []
    let messageSegmentCount = 0
    let receivedSegmentCount = 0;
    let receivedMessage = ""

    function onMessage(message) {
        handlers.forEach(handler => handler(message));
    }

    client.on('Network.webSocketFrameReceived', ({ requestId, timestamp, response }) => {
        // console.log('Network.webSocketFrameReceived', requestId, timestamp, response.payloadData)
        const message = response.payloadData;
        if (Number.isInteger(+message)) {
            messageSegmentCount = +message;
            receivedSegmentCount = 0;
            receivedMessage = ""
            return;
        }
        if (messageSegmentCount && receivedSegmentCount < messageSegmentCount) {
            receivedSegmentCount++;
            receivedMessage += message;
            if (receivedSegmentCount === messageSegmentCount) {
                messageSegmentCount = 0;
                onMessage(receivedMessage);
            }
            return;
        }
        onMessage(message);
    })
    return {
        register(handler) {
            handlers.push(handler)
        }
    }
};

module.exports = {
    createWebsocketMessageListener
}
