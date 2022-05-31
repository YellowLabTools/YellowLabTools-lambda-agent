const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ylt = require('yellowlabtools');

// noinspection JSUnusedLocalSymbols
async function runner({id, url, options = {}, acl}, context) {
    console.log(`Processing run #${id} on ${url}`);
    
    // AWS S3 bucket and path
    const bucket = process.env.RESULT_BUCKET_NAME;
    const keyPrefix = `results/${id}`;

    // Function that can save any file on S3 (JSON, screenshot,...)
    const saveFile = async (path, content, contentType = undefined) => s3.putObject({Bucket: bucket, Key: `${keyPrefix}/${path}`, Body: content, ...(!!contentType ? {ContentType: contentType} : {}), ...(!!acl ? {ACL: acl} : {})})
        .promise();
    
    // Let's launch ylt
    const result = await ylt(url, {...options, saveScreenshotFn: saveFile})
    
    .then(async data => {
        console.log(`Run succeeded`);

        data.runId = id;
        await saveFile('results.json', JSON.stringify(data), 'application/json');

        return {
            status: 'processed',
            id,
            bucket,
            keyPrefix
        };
    })
    
    .fail(error => {
        console.log(`Run failed with error: ${error}`);
        return {
            status: 'failed',
            id,
            bucket,
            errorMessage: error
        };
    });
    
    return result;
}

module.exports = {runner};