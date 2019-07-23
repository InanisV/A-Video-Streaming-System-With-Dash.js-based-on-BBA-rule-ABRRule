var child_process = require('child_process');

child_process.execFile('./h.sh', function(error, stdout, stderr){
    if(error){
        throw error;
    }
    res.send({
        message: 'https://monterosa.d2.comp.nus.edu.sg/~SWS3021T5/sh/t/video/manifest.mpd'
    });
    console.log(stdout);
    console.log("https://monterosa.d2.comp.nus.edu.sg/~SWS3021T5/sh/t/video/manifest.mpd");
});