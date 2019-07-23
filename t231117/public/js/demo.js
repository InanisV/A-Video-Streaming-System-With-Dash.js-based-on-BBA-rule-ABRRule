document.querySelector('#myFile').onchange = event => {
    const e = event || window.event;
    const target = e.target || e.srcElement;
    const file = target.files[0];
    const formdata = new FormData();

    document.getElementById(1).innerHTML="Uploading"
    formdata.append('myFile', file);    // 添加上传的文件对象
    document.getElementById(1).innerHTML="Transcoding"
    fetch('/upload', {                  // 上传路径
        method: 'POST',
        body: formdata,
    })
        .then(res => res.json())
        .then(res => alert(res.message))
        .catch(err => console.dir(err));
    document.getElementById(1).innerHTML="Upload Successfully"
};