var net = require('net');
const cluster = require('cluster');

const dgram = require('dgram');
const udp_server = dgram.createSocket('udp4');

var HOST = '127.0.0.1';
var PORT = 6969;

if (cluster.isMaster) {
    let processess = {};

    /* TCP server */

    let tcp_server = net.createServer();

    tcp_server.on("connection", (socket) => {
        let givenkey = `${socket.remoteAddress}:${socket.remotePort}`
        let childProcess = cluster.fork();
        processess[givenkey] = childProcess;
        childProcess.send("socket", socket);

        childProcess.on("disconnect", () => {
            processess[givenkey].kill();
            delete processess[givenkey];
        }).on("message", (msg) => {
            for ([key,value] of Object.entries(processess)){
                if(key !== givenkey){
                    value.send(msg);
                }
            }
        });
    })

    tcp_server.on("close", () => {
        console.log("Server stopped");
    });

    tcp_server.listen(PORT, HOST);

    console.log(`TCP server listening on ${HOST}:${PORT}`);

    /* UDP server */


    udp_server.on('error', (err) => {
      console.log(`server error:\n${err.stack}`);
      server.close();
    });

    udp_server.on('message', (msg, rinfo) => {
        console.log(`UDP server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
        let givenkey = `${rinfo.address}:${rinfo.port}`;
        if(processess[givenkey]){
            for ([key,value] of Object.entries(processess)){
                if(key !== givenkey){
                    udp_server.send(msg, parseInt(key.split(":")[1]), key.split(":")[0]);
                };
            }
        }
    });

    udp_server.on('listening', () => {
      const address = udp_server.address();
      console.log(`UDP server listening ${address.address}:${address.port}`);
    });

    udp_server.bind(PORT, HOST);

} else {
  let socket;
  let nick;

  new Promise((resolve, reject) => {
    process.on("message", (m, data) => {
      if(m === 'socket') {
        socket = data;
        resolve();
      }
    }).on("error", () => {
      reject();
    });
  }).then(() => {
    process.on("message", (m, data) => {
      socket.write(m);
    });

    socket.write('Choose nick');
    socket.on('data', (data) => {
        if(nick) {
            console.log(`${nick}: ${data}`);
            process.send(`${nick}: ${data}`);
        }
        else {
            nick = data.toString();
            console.log(`Client ${nick} joined`);
            socket.write(`You are logged in ${nick}.`);
        }
    }).on('close', () => {
        console.log(`Client ${nick} removed`);
        process.disconnect();
    });
  });
}
