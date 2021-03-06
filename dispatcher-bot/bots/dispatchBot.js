// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler } = require('botbuilder');
const { LuisRecognizer, QnAMaker } = require('botbuilder-ai');

class DispatchBot extends ActivityHandler {
    constructor() {
        super();

        // If the includeApiResults parameter is set to true, as shown below, the full response
        // from the LUIS api will be made available in the properties  of the RecognizerResult
        const dispatchRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint: `https://${ process.env.LuisAPIHostName }.api.cognitive.microsoft.com`
        }, {
            includeAllIntents: true,
            includeInstanceData: true
        }, true);

        const qnaCovidMaker = new QnAMaker({
            knowledgeBaseId: process.env.CovidQnAKnowledgebaseId,
            endpointKey: process.env.CovidQnAEndpointKey,
            host: process.env.CovidQnAEndpointHostName
        });

        const qnaFoodMaker = new QnAMaker({
            knowledgeBaseId: process.env.FoodQnAKnowledgebaseId,
            endpointKey: process.env.FoodQnAEndpointKey,
            host: process.env.FoodQnAEndpointHostName
        });

        const qnaHousingMaker = new QnAMaker({
            knowledgeBaseId: process.env.HousingQnAKnowledgebaseId,
            endpointKey: process.env.HousingQnAEndpointKey,
            host: process.env.HousingQnAEndpointHostName
        });

        const qnaFinancialMaker = new QnAMaker({
            knowledgeBaseId: process.env.FinancialQnAKnowledgebaseId,
            endpointKey: process.env.FinancialQnAEndpointKey,
            host: process.env.FinancialQnAEndpointHostName
        });

        this.dispatchRecognizer = dispatchRecognizer;
        this.qnaCovidMaker = qnaCovidMaker;
        this.qnaFoodMaker = qnaFoodMaker;
        this.qnaHousingMaker = qnaHousingMaker;
        this.qnaFinancialMaker = qnaFinancialMaker;

        this.onMessage(async (context, next) => {
            console.log('Processing Message Activity.');

            // First, we use the dispatch model to determine which cognitive service (LUIS or QnA) to use.
            const recognizerResult = await dispatchRecognizer.recognize(context);
            console.log(recognizerResult);
            // Top intent tell us which cognitive service to use.
            const intent = LuisRecognizer.topIntent(recognizerResult);
            // Next, we call the dispatcher with the top intent.
            await this.dispatchToTopIntentAsync(context, intent, recognizerResult);

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const welcomeText = 'Type a greeting or a question about the weather to get started.';
            const membersAdded = context.activity.membersAdded;

            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(`Welcome to Dispatch bot ${ member.name }. ${ welcomeText }`);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    async dispatchToTopIntentAsync(context, intent, recognizerResult) {
        switch (intent) {
        case 'l_HomeAutomation':
            await this.processHomeAutomation(context, recognizerResult.luisResult);
            break;
        case 'l_Weather':
            await this.processWeather(context, recognizerResult.luisResult);
            break;
        case 'q_covid-19-qna':
            await this.processCovidQnA(context);
            break;
        case 'q_food-qna':
            await this.processFoodQnA(context);
            break;
        case 'q_housing-qna':
            await this.processHousingQnA(context);
            break;
        case 'q_financial-qna':
            await this.processFinancialQnA(context);
            break;
        default:
            console.log(`Dispatch unrecognized intent: ${ intent }.`);
            await context.sendActivity(`Dispatch unrecognized intent: ${ intent }.`);
            break;
        }
    }

    async processHomeAutomation(context, luisResult) {
        console.log('processHomeAutomation');

        // Retrieve LUIS result for Process Automation.
        const result = luisResult.connectedServiceResult;
        const intent = result.topScoringIntent.intent;

        await context.sendActivity(`HomeAutomation top intent ${ intent }.`);
        await context.sendActivity(`HomeAutomation intents detected:  ${ luisResult.intents.map((intentObj) => intentObj.intent).join('\n\n') }.`);

        if (luisResult.entities.length > 0) {
            await context.sendActivity(`HomeAutomation entities were found in the message: ${ luisResult.entities.map((entityObj) => entityObj.entity).join('\n\n') }.`);
        }
    }

    async processWeather(context, luisResult) {
        console.log('processWeather');

        // Retrieve LUIS results for Weather.
        const result = luisResult.connectedServiceResult;
        const topIntent = result.topScoringIntent.intent;

        await context.sendActivity(`ProcessWeather top intent ${ topIntent }.`);
        await context.sendActivity(`ProcessWeather intents detected:  ${ luisResult.intents.map((intentObj) => intentObj.intent).join('\n\n') }.`);

        if (luisResult.entities.length > 0) {
            await context.sendActivity(`ProcessWeather entities were found in the message: ${ luisResult.entities.map((entityObj) => entityObj.entity).join('\n\n') }.`);
        }
    }

    async processCovidQnA(context) {
        console.log('processCovidQnA');

        const results = await this.qnaCovidMaker.getAnswers(context);

        if (results.length > 0) {
            await context.sendActivity(`${ results[0].answer }`);
        } else {
            await context.sendActivity('Sorry, could not find an answer in the Covid Q and A system.');
        }
    }

    async processFoodQnA(context) {
        console.log('processFoodQnA');

        const results = await this.qnaFoodMaker.getAnswers(context);

        if (results.length > 0) {
            await context.sendActivity(`${ results[0].answer }`);
        } else {
            await context.sendActivity('Sorry, could not find an answer in the Food Q and A system.');
        }
    }

    async processHousingQnA(context) {
        console.log('processHousingQnA');

        const results = await this.qnaHousingMaker.getAnswers(context);

        if (results.length > 0) {
            await context.sendActivity(`${ results[0].answer }`);
        } else {
            await context.sendActivity('Sorry, could not find an answer in the Housing Q and A system.');
        }
    }

    async processFinancialQnA(context) {
        console.log('processFinancialQnA');

        const results = await this.qnaFinancialMaker.getAnswers(context);

        if (results.length > 0) {
            await context.sendActivity(`${ results[0].answer }`);
        } else {
            await context.sendActivity('Sorry, could not find an answer in the Financial Q and A system.');
        }
    }
}

module.exports.DispatchBot = DispatchBot;
