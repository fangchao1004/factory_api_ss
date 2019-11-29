const Koa = require('koa')
const cors = require('koa2-cors');
const koaBody = require('koa-body')
const Router = require('koa-router');
const compress = require('koa-compress');
const router = new Router();
const app = new Koa()
const options = { threshold: 2048 }
const Core = require('@alicloud/pop-core');
const moment = require('moment')

const db = require('./config/db')
const schedule = require('node-schedule')

var client = new Core({
    accessKeyId: 'LTAIKlkSwGRxGUs2',
    accessKeySecret: 'VwwbCrudDp7g2cDmk6vNBtiwcCliyV',
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25'
})

var requestOption = {
    method: 'POST'
}

app.use(compress(options))
app.use(cors())
app.use(koaBody({ multipart: true }));
app.use(router.routes()).use(router.allowedMethods())

/**
 * 直接传入sqlserver语句 操作数据库
 */
router.post('/obs', async (ctx, next) => {
    // console.log("sql语句：", ctx.request.body.sql);
    try {
        const result = await fetchDataFromDB(ctx.request.body.sql);
        ctx.response.type = 'json'
        ctx.response.body = { code: 0, data: result }
    } catch (error) {
        ctx.response.type = 'json'
        ctx.response.body = { code: -1, data: error }
    }
})

/**
 * 查询所有的交易记录
 */
router.post('/getAllTransactionInfo', async (ctx, next) => {
    try {
        console.log('ctx.request.body:',ctx.request.body);
        const currentPage = ctx.request.body.currentPage || 1
        const pageSize = ctx.request.body.pageSize || 10
        const limitValue = pageSize * (currentPage - 1)
        const sql = `SELECT top ${pageSize} t.*,td.*,a.AccountName FROM [Transaction] t
        LEFT JOIN TransactionDetail td
        ON t.TransactionID = td.TransactionID
        LEFT JOIN Account a
        ON t.AccountID = a.AccountID
        where t.TransactionID not in (
        select top ${limitValue} TransactionID FROM [Transaction]
        ORDER BY TransactionID DESC
        )
        ORDER BY t.TransactionID DESC`
        const result = await fetchDataFromDB(sql);
        ctx.response.type = 'json'
        ctx.response.body = { code: 0, data: result }
    } catch (error) {
        ctx.response.type = 'json'
        ctx.response.body = { code: -1, data: error }
    }
})

/**
 * 支持模糊查询某个人的所有交易记录
 */
router.post('/getSomeOneTransactionInfo', async (ctx, next) => {
    try {
        const sql = `SELECT t.*,td.*,a.AccountName FROM [Transaction] t
        LEFT JOIN TransactionDetail td
        ON t.TransactionID = td.TransactionID
        LEFT JOIN Account a
        ON t.AccountID = a.AccountID
        WHERE a.AccountName LIKE '%${ctx.request.body.accountName}%'
        ORDER BY t.TransactionID
        DESC`
        const result = await fetchDataFromDB(sql);
        ctx.response.type = 'json'
        ctx.response.body = { code: 0, data: result }
    } catch (error) {
        ctx.response.type = 'json'
        ctx.response.body = { code: -1, data: error }
    }
})

function fetchDataFromDB(sql) {
    return new Promise((resolve, reject) => {
        db.sql(sql, function (err, result) {
            if (!err) {
                // console.log(result.recordset);
                resolve(result.recordset);
            } else {
                reject('sql语句 操作sqlserver 发生错误');
            }
        })
    })
}

router.get('/version_update', async (ctx, next) => {
    ctx.response.type = 'json'
    ctx.response.body = { code: 0, vn: '0.0.1' }
})


//--------------------------------------------------------------------------------------------------------
//  启动定时器
//--------------------------------------------------------------------------------------------------------
const scheduleCronstyle = async () => {
    console.log('午餐定时器启动')
    schedule.scheduleJob('0 1 11 * * *', async () => {
        let nowMoment = moment()
        let todayStart = nowMoment.hours(9).minutes(30).seconds(0).format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z'
        let todayEnd = nowMoment.hours(11).minutes(01).seconds(0).format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z'
        let sql = `select a.AccountName
        from TransactionDetail td
        LEFT JOIN [Transaction] t ON t.TransactionID = td.TransactionID
        LEFT JOIN [Account] a ON t.AccountID = a.AccountID
        where td.TransactionTime>'${todayStart}' and td.TransactionTime<'${todayEnd}'`
        const result = await fetchDataFromDB(sql)
        let params = {
            "PhoneNumbers": 18119645092,
            "SignName": "中节能合肥",
            "TemplateCode": "SMS_174270804",
            "TemplateParam": JSON.stringify({
                time: moment().format('YYYY-MM-DD'),
                number: result.length,
                eat: '午'
            })
        }
        client.request('SendSms', params, requestOption).then((result) => {
            console.log(result)
        }, (ex) => {
            console.log(ex)
        })
    })
}
scheduleCronstyle()

app.listen(3007, () => { console.log('app started at port 3007') })