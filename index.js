const Daemon = require('monero-rpc').Daemon
const fs = require('fs');
const daemon = new Daemon('http://localhost:62469');
const readLastLines = require('read-last-lines');
const {
    exec
} = require('child_process');

const args = process.argv.slice(2);
const SignKey = args[0];

if (!SignKey) {
    console.log("We need the signing key to publish the Zite! Pass it as an argument ex: node index.js [KEY]");
    return;
}
var toCheckpoint;
var hashToCheckpoint;

function checkpointNow() {
    daemon.getLastBlockHeight((err, height) => {
        if (err) return console.log(err)
        toCheckpoint = height - 11;
        daemon.getBlockHeader(toCheckpoint, (err, header) => {
            if (err) return console.log(err)
            var toAppend = toCheckpoint + ":" + header.hash + "\n";

            readLastLines.read('checkpoints', 1).then(function(lines) {
                if (lines == toAppend) {
		// Checkpoint is already in file don't re-add it
                } else {
                    fs.appendFile('checkpoints', toAppend, function(err) {
                        if (err) throw err;
                        console.log('Added new checkpoint - ' + toCheckpoint);
                    }).catch(function(err) {})
                    console.log(err.message);
                }
            });
        })
    })
}

function updateZeronet() {
    exec('rm -rf ./ZeroBundle/ZeroNet/data/14upebVeZjYxQmdcj6zRhEovij2EymLL7d/checkpoints', (err, stdout, stderr) => {
        if (err) {
            return;
        }
        exec('cp -rf ./checkpoints ./ZeroBundle/ZeroNet/data/14upebVeZjYxQmdcj6zRhEovij2EymLL7d/index.html', (err, stdout, stderr) => {
            if (err) {
                return;
            }

            exec('python ZeroBundle/ZeroNet/zeronet.py siteSign 14upebVeZjYxQmdcj6zRhEovij2EymLL7d ' + SignKey, (err, stdout, stderr) => {
                if (err) {
                    return;
                }

                exec('python ZeroBundle/ZeroNet/zeronet.py sitePublish 14upebVeZjYxQmdcj6zRhEovij2EymLL7d', (err, stdout, stderr) => {
                    if (err) {
                        return;
                    }
                    console.log("Updated Zeronet page with latest checkpoint data");
                });
            });
        });
    });
}

setInterval(function() {
    checkpointNow()
}, 5000);

setInterval(function() {
    updateZeronet()
}, 10000);
