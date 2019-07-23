import SwitchRequest from '../SwitchRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';
import MetricsModel from "../../models/MetricsModel";

function BBA0Rule(config) {

    config = config || {};
    const context = this.context;

    const dashMetrics = config.dashMetrics;
    let metricsModel = MetricsModel(context).getInstance();

    let instance,
        logger;
    const reservoir = 8;
    const cushion = 30;
    let ratePrev  = 0;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);

    }

    function comp(propertyName) {
        return function(object1, object2)
        {
            var value1 = object1[propertyName];
            var value2 = object2[propertyName];
            return value1 - value2;
        };
    }

    function fun(currentBufferLevel, step, rateMap)
    {
        if(currentBufferLevel <= cushion+reservoir && currentBufferLevel >= reservoir)
            return rateMap[Math.round((currentBufferLevel-reservoir)/step)*step + reservoir];

        else if(currentBufferLevel > cushion + reservoir)
            return rateMap[cushion + reservoir];

        else
            return rateMap[reservoir];
    }

    function getMaxIndex(rulesContext) {
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaInfo().type;
        const metrics = metricsModel.getMetricsFor(mediaType, true);
        const abrController = rulesContext.getAbrController();
        const switchRequest = SwitchRequest(context).create();

        if (mediaType === 'video')
        {
            let bitrateList = abrController.getBitrateList(mediaInfo);
            bitrateList.sort(comp('bitrate'));
            let rateMap = {};

            let step = cushion / (bitrateList.length-1);

            for(let i = 0; i < bitrateList.length; i++)
                rateMap[reservoir + i * step] = bitrateList[i].bitrate;

            let rateMax = bitrateList[bitrateList.length-1].bitrate;
            let rateMin = bitrateList[0].bitrate;
            ratePrev = ratePrev > rateMin ? ratePrev : rateMin;
            let ratePlus = rateMax;
            let rateMinus = rateMin;

            if(ratePrev === rateMax)
                ratePlus = rateMax;
            else
                for(let i = 0; i < bitrateList.length; i++)
                    if(bitrateList[i].bitrate > ratePrev)
                    {
                        ratePlus = bitrateList[i].bitrate;
                        break;
                    }

            if(ratePrev === rateMin)
                rateMinus = rateMin;
            else
                for(let i = bitrateList.length-1; i >= 0; i--)
                    if(bitrateList[i].bitrate < ratePrev)
                    {
                        rateMinus = bitrateList[i].bitrate;
                        break;
                    }
            let currentBufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
            let fCurrentBufferLevel = fun(currentBufferLevel, step, rateMap);

            let rateNext;
            if(currentBufferLevel <= reservoir)
                rateNext = rateMin;
            else if(currentBufferLevel >= reservoir + cushion)
                rateNext = rateMax;
            else if(fCurrentBufferLevel >= ratePlus)
            {
                for(let i = bitrateList.length-1; i >= 0; i--)
                    if(bitrateList[i].bitrate <= fCurrentBufferLevel)
                    {
                        rateNext = bitrateList[i].bitrate;
                        break;
                    }
            }
            else if(fCurrentBufferLevel <= rateMinus)
            {
                for(let i = 0; i < bitrateList.length; i++)
                    if(bitrateList[i].bitrate > fCurrentBufferLevel)
                    {
                        rateNext = bitrateList[i].bitrate;
                        break;
                    }
            }
            else
                rateNext = ratePrev;
            ratePrev = rateNext;
            switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, rateNext/1000, 0);

        } else
            switchRequest.quality = 0;

        return switchRequest;
    }

    function reset() {
        // no persistent information to reset
    }

    instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;
}

BBA0Rule.__dashjs_factory_name = 'BBA0Rule';
export default FactoryMaker.getClassFactory(BBA0Rule);

