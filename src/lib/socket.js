let SSL_HOST = 'wss://beet.bitshares.org:60556/';
let LOCAL_HOST = 'ws://localhost:60555/';
let _allowFallback = false;

let getWebSocketConnection = function (onopen = null, onmessage = null, onclose = null, onerror = null) {
    let _host = SSL_HOST;
    let _next = LOCAL_HOST;
    let _ignoreErrorsFrom = [];

    let _connect = function (host, next) {
        return new Promise((resolve, reject) => {

            const _isFallbackPossible = _allowFallback && next !== null;
            const _tryFallback = () => {
                console.log("Falling back to localhost socket", next);
                _connect(next, null).then(socket => {
                    resolve(socket);
                }).catch(reject);
            };


            try {
                let socket = new WebSocket(host);
                socket.onerror = function (event) {
                    _ignoreErrorsFrom.push(host);
                    // only fallback for an error on first initialisation
                    if (_isFallbackPossible) {
                        event.stopPropagation();
                        event.preventDefault();
                        _tryFallback();
                    } else {
                        reject("Socket initialization errored.")
                        if (onerror != null) {
                            console.log(event)
                            onerror(event, socket);
                        }
                    }
                };
                socket.onopen = function (event) {
                    if (event.target && event.target.url && _ignoreErrorsFrom.includes(event.target.url)) {
                        if (socket.readyState === socket.OPEN || socket.readyState === socket.CONNECTING) {
                            socket.close();
                        }
                        console.error("Ignoring onopen for errored socket, this shouldn't happen!");
                        return;
                    }
                    resolve(socket);
                    // requeue following commands at the end of stack
                    setTimeout(() => {
                        if (onopen !== null) {
                            onopen(event, socket);
                        }
                    });
                };
                socket.onclose = function (event) {
                    if (event.target && event.target.url && _ignoreErrorsFrom.includes(event.target.url)) {
                        console.log("Ignoring onclose for errored socket: ", event.target.url);
                        return;
                    }
                    reject("Socket was closed");
                    if (onclose !== null) {
                        onclose(event, socket);
                    }
                };
                socket.onmessage = function (event) {
                    if (event.target && event.target.url && _ignoreErrorsFrom.includes(event.target.url)) {
                        if (socket.readyState === socket.OPEN || socket.readyState === socket.CONNECTING) {
                            socket.close();
                        }
                        console.error("Ignoring onmessage for errored socket, this shouldn't happen!");
                        return;
                    }
                    if (onmessage !== null) {
                        onmessage(event, socket);
                    }
                };
            } catch (err) {
                if (_isFallbackPossible) {
                    event.stopPropagation();
                    event.preventDefault();
                    _tryFallback();
                } else {
                    console.log(err);
                }
            }

        });
    };
    return _connect(_host, _next);
};

let allowFallback = function () {
    _allowFallback = true;
};

export {getWebSocketConnection, allowFallback};
