const path = require('path')
const express = require('express');
const app = express();
const fs = require('fs');
const multer = require('multer');
const storage = multer.diskStorage({        // 设置multer参数，个性化指定上传目录和文件名
    destination: (req, file, cb) => {
        const uploadFolder = './video';  // 保存上传文件的目录
        try {
            fs.accessSync(uploadFolder);
        } catch (error) {
            fs.mkdirSync(uploadFolder);
        }
        cb(null, uploadFolder);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({                     // 实例化multer对象
    storage: storage
});

// 静态化资源

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    const html = fs.readFileSync('./view/index1.html', { encoding: 'utf8' });    res.send(html);
});//首页


app.get('/index', function (req, res) {
    const html = fs.readFileSync('./view/index1.html', { encoding: 'utf8' });
    res.send(html);
});//首页

app.get('/upload',(req,res)=>{
    const html = fs.readFileSync('./view/upload.html', { encoding: 'utf8' });
    res.send(html);
});//文件上传界面

app.get('/play',(req,res)=>{
    res.redirect('http://monterosa.d2.comp.nus.edu.sg/~SWS3021T5/dashCustom/samples/dash-if-reference-player/index.html');
});//播放界面

app.get('/about',(req,res)=>{
    const html = fs.readFileSync('./view/about.html', { encoding: 'utf8' });
    res.send(html);
});//关于

app.get('/compare',(req,res)=>{
    const html = fs.readFileSync('./view/player/compare.html', { encoding: 'utf8' });
    res.send(html);
});//关于

app.post('/upload', upload.single('myFile'), (req, res) => {
    var child_process = require('child_process');
    child_process.execFile('./s0.sh', function(error, stdout, stderr){
        if(error){
            throw error;
        }
        res.send({
            message: '上传且解码完成\n链接：https://monterosa.d2.comp.nus.edu.sg/~SWS3021T5/sh/t/video/manifest.mpd'
        });
        console.log(stdout);
        console.log("https://monterosa.d2.comp.nus.edu.sg/~SWS3021T5/sh/t/video/manifest.mpd");
    });
});//上传并运行脚本




var server = app.listen(8080, function () {

    var host = "http://monterosa.d2.comp.nus.edu.sg"
    var port = server.address().port

    console.log("Server is running.\n%s:%s", host, port)

});//服务器搭建在8080端口
