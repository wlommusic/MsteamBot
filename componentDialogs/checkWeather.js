const { ActivityHandler } = require('botbuilder');
const { CardFactory } = require('botbuilder');
const axios = require('axios');
// The accessor names for the conversation flow and user profile state property accessors.
const CONVERSATION_FLOW_PROPERTY = 'CONVERSATION_FLOW_PROPERTY';
const USER_PROFILE_PROPERTY = 'USER_PROFILE_PROPERTY';
const weatherCard = require('../resources/cards/weather.json');
const cardArr = [
    weatherCard
];
// Identifies the last question asked.
const question = {
    name: 'name',
    none: 'none'
};
const endDialog = '';
const APIKEY = '4245b93331cedf3e4bb02af75c1d6010';

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
                const res = await this.weatherFunc(profile.name);
                const msg = res;
                await turnContext.sendActivity(
                    {
                        text: `todays weather:${ JSON.stringify(msg, null, 2) }`,
                        attachments: [CardFactory.adaptiveCard(cardArr[0])]
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

    async isDialogComplete() {
        return await endDialog;
    }

    static async weatherFunc(cityname) {
        try {
            const resp = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${ cityname }&appid=${ APIKEY }`);
            return ((resp.data));
        } catch (err) {
            // Handle Error Here
            console.log(err);
        }
    }
}
module.exports.CheckWeatherDialog = CheckWeatherDialog;
