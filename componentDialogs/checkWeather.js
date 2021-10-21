const { ActivityHandler } = require('botbuilder');
const { CardFactory } = require('botbuilder');
const axios = require('axios');
// The accessor names for the conversation flow and user profile state property accessors.
const CONVERSATION_FLOW_PROPERTY = 'CONVERSATION_FLOW_PROPERTY';
const USER_PROFILE_PROPERTY = 'USER_PROFILE_PROPERTY';

// Identifies the last question asked.
const question = {
    name: 'name',
    none: 'none'
};
var endDialog = '';

// Defines a bot for filling a user profile.
class CheckWeatherDialog extends ActivityHandler {
    constructor(conversationState, userState) {
        super();
        // The state property accessors for conversation flow and user profile.
        this.conversationFlow = conversationState.createProperty(CONVERSATION_FLOW_PROPERTY);
        this.userProfile = userState.createProperty(USER_PROFILE_PROPERTY);

        // The state management objects for the conversation and user.
        this.conversationState = conversationState;
        this.userState = userState;

        this.onMessage(async (turnContext, next) => {
            const flow = await this.conversationFlow.get(turnContext, { lastQuestionAsked: question.none });
            const profile = await this.userProfile.get(turnContext, {});

            await CheckWeatherDialog.fillOutUserProfile(flow, profile, turnContext);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }

    // Manages the conversation flow for filling out the user's profile.
    static async fillOutUserProfile(flow, profile, turnContext) {
        const input = turnContext.activity.text;
        let result;
        switch (flow.lastQuestionAsked) {
        // If we're just starting off, we haven't asked the user for any information yet.
        // Ask the user for their name and update the conversation flag.
        case question.none:
            await turnContext.sendActivity("Let's get started. What is your city name?");
            flow.lastQuestionAsked = question.name;
            break;

        // If we last asked for their name, record their response, confirm that we got it.
        // Ask them for their age and update the conversation flag.
        case question.name:
            result = this.validateName(input);
            if (result.success) {
                profile.name = result.name;
                await turnContext.sendActivity(`I have your city name as ${ profile.name }.`);
                const weather = await this.fetchweatherFunc2(profile.name);
                await turnContext.sendActivity(
                    {
                        text: `todays weather: ${ weather.weather }`,
                        attachments: [CardFactory.adaptiveCard(
                            {

                                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                                type: 'AdaptiveCard',
                                version: '1.3',
                                speak: 'Weather forecast for Monday is high of 62 and low of 42 degrees with a 20% chance of rainWinds will be 5 mph from the northeast',
                                body: [
                                    {
                                        type: 'TextBlock',
                                        text: `${ weather.city },${ weather.country }`,
                                        size: 'Large',
                                        isSubtle: true,
                                        wrap: true
                                    },
                                    {
                                        type: 'TextBlock',
                                        text: new Date().toISOString().slice(0, 10),
                                        spacing: 'None',
                                        wrap: true
                                    },
                                    {
                                        type: 'ColumnSet',
                                        columns: [
                                            {
                                                type: 'Column',
                                                width: 'auto',
                                                items: [
                                                    {
                                                        type: 'Image',
                                                        url: `http://openweathermap.org/img/w/${ weather.icon }.png`,
                                                        size: 'Small'
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'Column',
                                                width: 'auto',
                                                items: [
                                                    {
                                                        type: 'TextBlock',
                                                        text: `${ weather.weather }`,
                                                        size: 'ExtraLarge',
                                                        spacing: 'None',
                                                        wrap: true
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'Column',
                                                width: 'stretch',
                                                items: [
                                                    {
                                                        type: 'TextBlock',
                                                        text: '°C',
                                                        weight: 'Bolder',
                                                        spacing: 'Small',
                                                        wrap: true
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'Column',
                                                width: 'stretch',
                                                items: [
                                                    {
                                                        type: 'TextBlock',
                                                        text: `HI ${ parseFloat(weather.max_temp - 273.15).toFixed(2) } °C`,
                                                        wrap: true
                                                    },
                                                    {
                                                        type: 'TextBlock',
                                                        text: `LO ${ parseFloat(weather.min_temp - 273.15).toFixed(2) } °C`,
                                                        spacing: 'None',
                                                        wrap: true
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        )]
                    }
                );
                break;
            } else {
                // If we couldn't interpret their input, ask them for it again.
                // Don't update the conversation flag, so that we repeat this step.
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }
        }
    }

    // Validates name input. Returns whether validation succeeded and either the parsed and normalized
    // value or a message the bot can use to ask the user again.
    static validateName(input) {
        const name = input && input.trim();
        return name !== undefined
            ? { success: true, name: name }
            : { success: false, message: 'Please enter a name that contains at least one character.' };
    };

    static async fetchweatherFunc2(cityname) {
        const obj = {};
        var url = `https://api.openweathermap.org/data/2.5/weather?q=${ cityname }&appid=${ process.env.APIKEY }`;
        const resp = await axios.get(url);
        obj.city = resp.data.name;
        obj.weather = resp.data.weather[0].main;
        obj.description = resp.data.weather[0].description;
        obj.max_temp = resp.data.main.temp_min;
        obj.min_temp = resp.data.main.temp_max;
        obj.lat = resp.data.coord.lat;
        obj.lon = resp.data.coord.lon;
        obj.temp = resp.data.main.temp;
        obj.country = resp.data.sys.country;
        obj.icon = resp.data.weather[0].icon;
        return obj;
    };

    async summaryStep(step) {
        if (step.result === true) {
            // Business
            await step.context.sendActivity('thanks for checking out the bot');
            endDialog = true;
            return await step.endDialog();
        }
    }

    async isDialogComplete() {
        return await endDialog;
    }
}
module.exports.CheckWeatherDialog = CheckWeatherDialog;
