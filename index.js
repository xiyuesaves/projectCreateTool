const pageData = require("./pageData.js");
const pinyin = require("tiny-pinyin");
const fs = require("fs");
const ejs = require("ejs");

try {
	// 测试代码,删除src目录
	deleteFolder("./src");
} catch (err) { console.log(err) }


initFile()

function initFile() {
	try {
		// 初始化目录结构
		fs.mkdirSync("./src");
		fs.mkdirSync("./src/lib");
		fs.mkdirSync("./src/static");
		fs.mkdirSync("./src/static/js");
		fs.mkdirSync("./src/static/img");
		fs.mkdirSync("./src/static/css");
		// 页面文件
		pageData.page.forEach(el => {
			fs.writeFileSync(`./src/${getFileName(el)}.ejs`, replaceMarker(pageData.pageTemplate, el));
			fs.writeFileSync(`./src/static/css/${getFileName(el)}.css`, `/* ${getName(el)} */`);
			fs.writeFileSync(`./src/static/js/${getFileName(el)}.js`, `// ${getName(el)}`);
		})
		// 公用模板
		pageData.public.forEach(el => {
			fs.writeFileSync(`./src/lib/${getFileName(el)}.ejs`, `<!-- 公用模板 ${getName(el)} -->`);
		})
		// 公用资源文件
		pageData.lib.forEach(el => {
			fs.writeFileSync(`./src/static/${el[0]}/${el[1]}`, el[2] ? el[2] : el[1]);
		})
		renderProcess();
	} catch (err) { console.log(err) }
}

// 返回文件名
function getFileName(el) {
	if (Array.isArray(el)) {
		return el[1];
	} else {
		return pinyin.convertToPinyin(el).toLowerCase();
	}
}

// 返回页面名
function getName(el) {
	if (Array.isArray(el)) {
		return el[0];
	} else {
		return el;
	}
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
		if (el[0] === "js") {
			ctx += `\n	<script src='static/js/${el[1]}'></script>`
		} else if (el[0] === "css") {
			ctx += `\n	<link rel='stylesheet' type='text/css' href='static/css/${el[1]}'>`
		}
	})
	// 私有文件
	ctx += `
	<!-- 私有框架 -->
	<script src='static/js/${fileName}.js'></script>
	<link rel='stylesheet' type='text/css' href='static/css/${fileName}.css'>`;
	// 公用模板文件
	let body = "";
	pageData.public.forEach(el => {
		body += `	<!-- ${getName(el)} -->\n	<%-include("lib/${getFileName(el)}.ejs")%>\n`;
	})
	str = str.replace("{{public}}", ctx).replace("{{body}}", body);
	return str;
}

// 删除有文件的文件夹
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
function renderProcess() {
	pageData.page.forEach(async el => {
		// let template = fs.readFileSync(`./src/${getFileName(el)}.ejs`, "utf-8")
		let renderFile = await ejs.renderFile(`./src/${getFileName(el)}.ejs`, {name:getName(el)});

		console.log(renderFile)
	})
}