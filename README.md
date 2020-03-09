# ChatApp
A web app for realtime communication using Node.js and SimplePeer.

#### Simple WebRTC voice and text communication app.

## Features
- **works in the browser!**
- supports **voice streams**
- supports **text chat**

## Usage
If using a reverse proxy server
```
node index.js http
```

For running with an SSL certificate from a trusted CA
```
node index.js https
```

For running with a self-signed SSL certificate
```
node index.js https-ss
```

## HTTPS issue/site not secure 
In order for the browser to access a user's microphone orcamera, it requires that the site use HTTPS. For this, you must have an SSL certificate, which can be acquired online through trusted certificate authorities, or by generating and self-signing one.

## License

MIT. Copyright (c) [Justin Buttrey](http://jbuttrey.com).
