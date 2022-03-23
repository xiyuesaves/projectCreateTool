const pageData = require("./pageData.json");
const express = require("express");
const path = require("path");
const pinyin = require("tiny-pinyin");
const fs = require("fs");
const ejs = require("ejs");
const chokidar = require("chokidar");

const args = process.argv.slice(2);

switch (args[0]) {
	case "create":
		initFile();
		break;
	case "dev":
		httpServer();
		break;
	case "build":
		build();
		break;
	default:
		console.log("请添加有效参数\ncreate - 创建\ndev - 开发模式 \nbuild - 编译发布")
}

function initFile() {
	if (!fs.existsSync("./src")) {
		console.log("开始创建新项目");
		// 初始化目录结构
		fs.mkdirSync("./src");
		fs.mkdirSync("./src/lib");
		fs.mkdirSync("./src/static");
		fs.mkdirSync("./src/static/js");
		fs.mkdirSync("./src/static/img");
		fs.mkdirSync("./src/static/css");
		// 页面文件
		pageData.page.forEach(el => {
			fs.writeFileSync(`./src/${getFileName(el)}.ejs`, replaceMarker(getContent(el.content), el));
			fs.writeFileSync(`./src/static/css/${getFileName(el)}.css`, `/* ${el.name} */`);
			fs.writeFileSync(`./src/static/js/${getFileName(el)}.js`, `// ${el.name}`);
		})
		// 公用模板
		pageData.public.forEach(el => {
			fs.writeFileSync(`./src/lib/${getFileName(el)}.ejs`, `<!-- 公用模板 ${el.name} -->`);
		})
		// 公用资源文件
		pageData.lib.forEach(el => {
			fs.writeFileSync(`./src/static/${el.type}/${el.fileName}`, getContent(el.content));
		})
		httpServer();
	} else {
		console.log("请删除'src'目录后再进行创建操作");
	}
}

// 返回文件名
function getFileName(el) {
	if (el.fileName) {
		return el.fileName;
	} else {
		return pinyin.convertToPinyin(el.name).toLowerCase();
	}
}

// 获取内容
function getContent(data) {
	if (data.path) {
		return fs.readFileSync(data.path, "utf-8");
	} else if (data.str) {
		return data.str;
	}
	return "";
}

// 替换模板标记
function replaceMarker(str, el) {
	let fileName = getFileName(el),
		ctx = "";
	if (pageData.isPhone) {
		ctx += `	<meta name="viewport" content="width=device-width, user-scalable=no,initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">\n`;
	}
	// 全局文件
	ctx += `	<!-- 全局框架 -->`
	pageData.lib.forEach(el => {
		if (el.type === "js") {
			ctx += `\n	<script src='static/js/${el.fileName}'></script>`
		} else if (el.type === "css") {
			ctx += `\n	<link rel='stylesheet' type='text/css' href='static/css/${el.fileName}'>`
		}
	})
	// 私有文件
	ctx += `
	<!-- 私有框架 -->
	<script src='static/js/${fileName}.js'></script>
	<link rel='stylesheet' type='text/css' href='static/css/${fileName}.css'>`;
	// 公用模板文件
	let body = "";
	pageData.public.forEach((el, index) => {
		body += `${index ? "\n" : ""}	<!-- ${el.name} -->\n	<%-include("lib/${getFileName(el)}")%>`;
	})
	str = str.replace("{{public}}", ctx).replace("{{body}}", body);
	return str;
}

// 删除文件夹
function deleteFolder(filePath) {
	const files = []
	if (fs.existsSync(filePath)) {
		const files = fs.readdirSync(filePath)
		files.forEach((file) => {
			const nextFilePath = `${filePath}/${file}`
			const states = fs.statSync(nextFilePath)
			if (states.isDirectory()) {
				//recurse
				deleteFolder(nextFilePath)
			} else {
				//delete file
				fs.unlinkSync(nextFilePath)
			}
		})
		fs.rmdirSync(filePath)
	}
}

// 进程ejs处理
function build() {
	if (!fs.existsSync("./dist")) {
		fs.mkdirSync("./dist");
	} else {
		deleteFolder("./dist");
		fs.mkdirSync("./dist");
	}
	// 复制静态文件
	copyDir("./src/static", "./dist/static");
	pageData.page.forEach(async el => {
		let renderFile = await ejs.renderFile(`./src/${getFileName(el)}.ejs`, { name: el.name });
		fs.writeFileSync(`./dist/${getFileName(el)}.html`, renderFile);
	})
	console.log("编译完成")
}

/*
 * 复制目录、子目录，及其中的文件
 * @param src {String} 要复制的目录
 * @param dist {String} 复制到目标目录
 */
function copyDir(src, dist, callback) {
	fs.access(dist, function(err) {
		if (err) {
			// 目录不存在时创建目录
			fs.mkdirSync(dist);
		}
		_copy(null, src, dist);
	});

	function _copy(err, src, dist) {
		if (err) {
			callback(err);
		} else {
			fs.readdir(src, function(err, paths) {
				if (err) {
					callback(err)
				} else {
					paths.forEach(function(path) {
						var _src = src + '/' + path;
						var _dist = dist + '/' + path;
						fs.stat(_src, function(err, stat) {
							if (err) {
								callback(err);
							} else {
								// 判断是文件还是目录
								if (stat.isFile()) {
									fs.writeFileSync(_dist, fs.readFileSync(_src));
								} else if (stat.isDirectory()) {
									// 当是目录是，递归复制
									copyDir(_src, _dist, callback)
								}
							}
						})
					})
				}
			})
		}
	}
}

// http服务器
function httpServer() {
	const app = express();
	const port = 8899;
	app.set('views', './src');
	app.use(express.static(path.join("./", 'src')));
	app.set('view engine', 'ejs');
	app.get("*", (req, res) => {
		let pathName = req.url === "/" ? "index" : req._parsedOriginalUrl.pathname.replace(/^\//, "").replace(/\.html/, "");
		let data = pageData.page.find(el => {
			return getFileName(el) === pathName
		});
		if (data) {
			res.render(pathName, {name:data.name});
		} else {
			res.send("404 - 没有这个页面")
		}
	})

	app.listen(port, () => {
		console.log(`访问此地址查看效果 http://localhost:${port}`)
	})
}