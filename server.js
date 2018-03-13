var net = require('net');
const cluster = require('cluster');

var HOST = '127.0.0.1';
var PORT = 6969;

if (cluster.isMaster) {
    let processess = [];
    let key = 0;

    net.createServer().on("connection", (socket) => {
        processess[key] = cluster.fork();
        childProcess.send("socket", socket);

        childProcess.on("disconnect", () => {
            processess[key].kill();
            processess = [...processess.splice(0, key), processess.splice(key+1, processess.length)];
        })
    }).on("message", (msg, data) => {
        for (let proc in processess){
            if(proc !== key){
                proc.send(msg);
            }
        }
    }).on("close", () => {
        console.log("Server stopped");
    }).listen(PORT, HOST);

    console.log(`TCP server listening on ${HOST}:${PORT}`);
} 
