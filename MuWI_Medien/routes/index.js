'use strict';
var express = require('express');
var router = express.Router();

var upload = require('express-fileupload');
var mysql = require('mysql');
var fs = require('fs');

router.use(upload());

//database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'test',
    database: 'contentdb'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL connected...');
});

/* GET home page. */
router.get('/', function (req, res) {
    var html = '<input type="text"></input>';
    res.render('index', { title: 'MuWI', testVariable: html });
});

router.get('/upload', function (req, res) {
    res.render('upload');
});

router.get('/viewAllElements', function (req, res) {
    var sql = "SELECT * FROM contenttable";
    var path;
    db.query(sql, function (err, result) {
        if (err) throw err;
        var htmls = new Array(result.length);
        for (var i = 0; i < result.length; i++) {
            path = result[i].File.replace('./', '%2E%2F');
            path = path.replace('/', '%2F');
            switch (result[i].Type.toLowerCase()) {
                case 'png':
                case 'jpg':
                    htmls[i] = '<a href="./image/' + path + '"><img class="image" src= "./image/' + path + '"></a >';
                    break;
                case 'mp4':
                    htmls[i] = '<video class="image" onmouseover="play()" onmouseout="pause()" onclick="webkitRequestFullScreen()"><source src= "./media/' + path + '" type= "video/mp4" ></video >';
                    break;
                case 'mp3':
                    htmls[i] = '<audio class="image" controls><source src="./media/' + path + '" type="audio/mpeg">Your browser does not support the audio element.</audio>';
                    break;
                case 'pdf':
                    htmls[i] = '<object class="image" type="application/pdf" data="./document/' + path + '"></object>'
                    break;
                default:
                    htmls[i] = '<img class="image" src="./image/%2E%2Fuploads%2FunkownFormat.jpg">';
            }
        }
        res.render('netflix', {title: 'MuWI', itemList: htmls });
    });
});

router.get('/document/:path', function (req, res) {
    const path = req.params.path;
    const file = fs.createReadStream(path);
    res.writeHead(200, { 'Content-type': 'application/pdf' });
    file.pipe(res);
});

router.get('/image/:path', function (req, res) {
    const path = req.params.path;
    const file = fs.createReadStream(path);
    res.writeHead(200, { 'Content-type': 'image' });
    file.pipe(res);
});

router.get('/media/:path', function (req, res) {
    const path = req.params.path;
    const stat = fs.statSync(path);
    const fileFormat = path.split('.')[path.split('.').length - 1];
    var contentType;
    if (fileFormat == 'mp4') {
        contentType = 'video/mp4';
    }
    else if (fileFormat == 'mp3') {
        contentType = 'audio/mpeg';
    }
    else {
        contentType = 'unkown';
    }
    const fileName = stat.fileName
    const fileSize = stat.size
    const range = req.headers.range
    if (range) {
        console.log('range bekannt')
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : fileSize - 1

        const chunksize = (end - start) + 1
        const file = fs.createReadStream(path, { start, end })
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
        }

        res.writeHead(206, head)
        file.pipe(res)
    } else {
        console.log('range unbekannt')
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'audio/mpeg',
        }
        res.writeHead(200, head)
        fs.createReadStream(path).pipe(res)
    }
});

router.post('/uploadFile', function (req, res) {
    if (req.files) {
        var file = req.files.upfile;
        var filename = file.name;
        var title = filename.split('.')[0];
        var type = filename.split('.')[1];
        var comment = req.body.comment;
        var path = './uploads/';
        file.mv(path + filename, function (err) {
            if (err) {
                console.log(err)
                res.send("error occured")
            }
            else {
                console.log("Datei hochgeladen.")
                if (comment == 'Comment...') {
                    comment = '';
                };
                var sql = "INSERT INTO contenttable (ID, Title, Type, Comment, File) VALUES ('', '" + title + "', '" + type + "', '" + comment + "', '" + path + filename + "')";
                db.query(sql, function (err, result) {
                    if (err) throw err;
                    console.log("1 record inserted");
                });
            }
        })
    }
    else {
        res.send('No Files selected.');
        console.log('No Files selected');
    }
});


module.exports = router;
