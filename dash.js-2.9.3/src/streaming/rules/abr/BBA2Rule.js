const X = 120;
const NORMAL_LENGTH = 4;
const TEST_NUM = Math.ceil(X / NORMAL_LENGTH);
const NORMAL_RESERVOIR = 10;
const NORMAL_MIN_RATE = 700000;

import SwitchRequest from '../SwitchRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';

function BBA2Rule(config) {

    config = config || {};
    const context = this.context;

    const dashMetrics = config.dashMetrics;
    const metricsModel = config.metricsModel;

    let instance,
        logger;
    let bufferLevelPrev;
    let times = 0;
    let step;
    let rateMin;
    let rateMax;
    let segmentDuration = 3;
    let startup = true;
    let reservoir = NORMAL_RESERVOIR;
    const cushion = 30;
    let ratePrev = 0;
    let chunking = new Array(4);
    let bitrateList;
    let chunksizeMin;
    let chunksizeMax;
    let k = 0;
    let chunkIndex = 0;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        var result = null;
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", "https://monterosa.d2.comp.nus.edu.sg/~SWS3021T5/videos/chunks.txt", false);
        xmlhttp.send();
        if (xmlhttp.status === 200) {
            result = xmlhttp.responseText;
        }
        var data = result.split("\n");
        var segNum = data.length/4 - 1;
        for (let i = 0; i < chunking.length; i++)
            chunking[i] = new Array(segNum);

        let m = 0, n = 0;
        for (let i = 0; i < data.length; i++)
        {
            if (!isNaN(parseInt(data[i], 10)))
                chunking[m][n++] = data[i];
            else {
                m++;
                n = 0;
            }
        }
    }

    function comp(propertyName) {
        return function(object1, object2)
        {
            var value1 = object1[propertyName];
            var value2 = object2[propertyName];
            return value1 - value2;
        }
    }

    function fun(currentBufferLevel)
    {
        if(currentBufferLevel < reservoir)
            return chunksizeMin;
        else if(currentBufferLevel > reservoir + cushion)
            return chunksizeMax;
        else
            return (currentBufferLevel - reservoir) * k + chunksizeMin;
    }

    function findNextrate(ratePrev)
    {
        for(let i = 0; i < bitrateList.length; i++)
            if(bitrateList[i].bitrate > ratePrev)
                return bitrateList[i].bitrate;
        return bitrateList[bitrateList.length-1].bitrate;
    }

    function checkStartup(bufferLevelNow, bufferLevelPrev, ratePrev)
    {
        if(fun(bufferLevelNow, step, bitrateList) > findNextrate(ratePrev) || bufferLevelNow < bufferLevelPrev)
            return 2;
        else if(bufferLevelNow >= reservoir + cushion)
            return 1;
        else return 0;
    }

    function getMinSize()
    {
        let min = chunking[0][0];
        for(let i = 0; i < chunking.length; i++)
            for(let j = 0; j < chunking[i].length; j++)
                if(chunking[i][j] < min)
                    min = chunking[i][j];
        return min;
    }

    function getMaxSize()
    {
        let max = chunking[0][0];
        for(let i = 0; i < chunking.length; i++)
            for(let j = 0; j < chunking[i].length; j++)
                if(chunking[i][j] > max)
                    max = chunking[i][j];
        return max;
    }

    function initallize()
    {
        chunksizeMin = getMinSize();
        chunksizeMax = getMaxSize();
        k = (chunksizeMax - chunksizeMin) / cushion;
        bitrateList.sort(comp('bitrate'));
        rateMin = bitrateList[0].bitrate;
        rateMax = bitrateList[bitrateList.length-1].bitrate;
        ratePrev = rateMin;
        bufferLevelPrev = 0;
    }

    function getRateIndex(rate)
    {
        for(let i = 0; i < bitrateList.length; i++)
            if(bitrateList[i].bitrate == rate)
                return i;
    }

    function chunksizeToRate(chunksize)
    {
        let minDiff = Math.abs(chunking[0][0] - chunksize);
        let minDiffIndex = 0;
        let i;
        for(i = 0; i < chunking.length; i++)
            for(let j = 0; j < chunking[i].length; j++)
                if(Math.abs(chunking[i][j] - chunksize) < minDiff)
                {
                    minDiff = Math.abs(chunking[i][j] - chunksize);
                    minDiffIndex = i;
                }
        return bitrateList[minDiffIndex].bitrate;
    }

    function adjustReservoir()
    {
        let testSize = X * NORMAL_MIN_RATE;
        let realSize = 0;
        for (let i = 0; i < TEST_NUM; i++)
        {
            realSize += parseInt(chunking[0][chunkIndex+i], 10);
        }
        reservoir = NORMAL_RESERVOIR + Math.ceil((realSize * 8 - testSize) / NORMAL_MIN_RATE * 0.3);
    }

    function getNextRate(currentBufferLevel)
    {
        let ratePlus = rateMax;
        let rateMinus = rateMin;

        if(ratePrev == rateMax)
            ratePlus = rateMax;
        else
            for(let i = 0; i < bitrateList.length; i++)
                if(bitrateList[i].bitrate > ratePrev)
                {
                    ratePlus = bitrateList[i].bitrate;
                    break;
                }

        if(ratePrev == rateMin)
            rateMinus = rateMin;
        else
            for(let i = bitrateList.length-1; i >= 0; i--)
                if(bitrateList[i].bitrate < ratePrev)
                {
                    rateMinus = bitrateList[i].bitrate;
                    break;
                }

        let fCurrentBufferLevel = fun(currentBufferLevel);
        let rateNext;
        if(currentBufferLevel <= reservoir)
            rateNext = rateMin;
        else if(currentBufferLevel >= reservoir + cushion)
            rateNext = rateMax;
        else if(fCurrentBufferLevel >= chunking[getRateIndex(ratePlus)][times+1])
        {
            let rateTemp = chunksizeToRate(fCurrentBufferLevel);
            for(let i = bitrateList.length-1; i >= 0; i--)
                if(bitrateList[i].bitrate < rateTemp)
                {
                    rateNext = bitrateList[i].bitrate;
                    break;
                }
        }
        else if(fCurrentBufferLevel <= chunking[getRateIndex(rateMinus)][times+1])
        {
            let rateTemp = chunksizeToRate(fCurrentBufferLevel);
            for(let i = 0; i < bitrateList.length; i++)
                if(bitrateList[i].bitrate > rateTemp)
                {
                    rateNext = bitrateList[i].bitrate;
                    break;
                }
        }
        else
            rateNext = ratePrev;
        return rateNext;
    }


    function getMaxIndex(rulesContext) {
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        const abrController = rulesContext.getAbrController();
        const throughputHistory = abrController.getThroughputHistory();
        const switchRequest = SwitchRequest(context).create();
        const streamInfo = rulesContext.getStreamInfo();
        const isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;
        const LasthttpRequest = dashMetrics.getCurrentHttpRequest(metrics);
        let deltaB = 0;
        if(mediaType === 'audio')
            return switchRequest;
        if(times === 0)
        {
            bitrateList = abrController.getBitrateList(mediaInfo);
            initallize();
        }

        let url;
        if (LasthttpRequest)
        {
            url = LasthttpRequest.url;
            url = parseInt(url.substring(url.lastIndexOf('/')+1, url.lastIndexOf('.')), 10);
            if(!isNaN(url))
                chunkIndex = url;
        }

        if(startup === true && times !== 0)
        {
            let LasthttpRequest = dashMetrics.getCurrentHttpRequest(metrics);
            let SizeSegByte = LasthttpRequest.trace.reduce((a, b) => a + b.b[0], 0);
            let bufferLevelNow = dashMetrics.getCurrentBufferLevel(metrics);
            let status = checkStartup(bufferLevelNow, bufferLevelPrev, ratePrev);
            bufferLevelPrev = bufferLevelNow;
            let rateNow;
            if(status === 2)
            {
                rateNow = findNextrate(ratePrev);
                switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, rateNow/1000, 0);
                times++;
                startup = false;
                return switchRequest;
            }
            else
            {
                deltaB = segmentDuration - SizeSegByte*8/throughputHistory.getAverageThroughput(mediaType, isDynamic);
                if((status === 1 && deltaB+1 > 0.5 * segmentDuration) || (status === 0 && deltaB+1 > 0.875 * segmentDuration)) {
                    rateNow = findNextrate(ratePrev);
                    switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, rateNow/1000, 0);
                    ratePrev = rateNow;
                    times++;
                    return switchRequest;
                }
            }
        }

        let currentBufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
        if (currentBufferLevel < NORMAL_RESERVOIR || chunking[0].length - chunkIndex - 5 < TEST_NUM)
            reservoir = NORMAL_RESERVOIR;
        else
            adjustReservoir();

        let rateNext = getNextRate(currentBufferLevel);
        ratePrev = rateNext;
        switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, rateNext/1000, 0);
        times++;
        return switchRequest;
    }

    function reset() {
        // no persistent infosrmation to reset
    }

    instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;
}

BBA2Rule.__dashjs_factory_name = 'BBA2Rule';
export default FactoryMaker.getClassFactory(BBA2Rule);
