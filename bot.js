// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const { ActivityHandler, MessageFactory } = require('botbuilder');
const { CheckWeatherDialog } = require('./componentDialogs/checkWeather');
const { BookFlightDialog } = require('./componentDialogs/bookFlight');
const { CancelDialog } = require('./componentDialogs/cancelReservationDialog');
const { InfoDialog } = require('./componentDialogs/infoDialog');
class WEATHERBot extends ActivityHandler {
    constructor(conversationState, userState) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty('dialogState');
        this.CheckWeatherDialog = new CheckWeatherDialog(this.conversationState, this.userState);
        this.BookFlightDialog = new BookFlightDialog(this.conversationState, this.userState);
        this.CancelDialog = new CancelDialog(this.conversationState, this.userState);
        this.InfoDialog = new InfoDialog(this.conversationState, this.userState);

        this.previousIntent = this.conversationState.createProperty('previousIntent');
        this.conversationData = this.conversationState.createProperty('conservationData');

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            await this.dispatchToIntentAsync(context);

            await next();
        });

        this.onDialog(async (context, next) => {
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });
        this.onMembersAdded(async (context, next) => {
            await this.sendWelcomeMessage(context);
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    async sendWelcomeMessage(turnContext) {
        const { activity } = turnContext;

        // Iterate over all new members added to the conversation.
        for (const i in activity.membersAdded) {
            if (activity.membersAdded[i].id !== activity.recipient.id) {
                const welcomeMessage = `Welcome to the Bot ${ activity.membersAdded[i].name }. `;
                await turnContext.sendActivity(welcomeMessage);
                await this.sendDemoMsg(turnContext);
                await this.sendSuggestedActions(turnContext);
            }
        }
    }

    async sendSuggestedActions(turnContext) {
        var reply = MessageFactory.suggestedActions(['Check weather', 'Book Flight', 'cancel reservation', 'Info'], 'What would you like to do today ?');
        await turnContext.sendActivity(reply);
    }

    async sendDemoMsg(turnContext) {
        const reply = 'This bot is still learning  feel free to send suggestions';
        await turnContext.sendActivity(reply);
    }

    async dispatchToIntentAsync(context) {
        var currentIntent = '';
        const previousIntent = await this.previousIntent.get(context, {});
        const conversationData = await this.conversationData.get(context, {});

        if (previousIntent.intentName && conversationData.endDialog === false) {
            currentIntent = previousIntent.intentName;
        } else if (previousIntent.intentName && conversationData.endDialog === true) {
            currentIntent = context.activity.text;
        } else {
            currentIntent = context.activity.text;
            await this.previousIntent.set(context, { intentName: context.activity.text });
        }
        switch (currentIntent) {
        case 'Check weather':
            console.log('Inside weather Case');
            await this.conversationData.set(context, { endDialog: false });
            await this.CheckWeatherDialog.run(context, this.dialogState);
            conversationData.endDialog = await this.CheckWeatherDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
                await this.sendSuggestedActions(context);
            }
            break;
        case 'Book Flight':
            console.log('Inside book flight Case');
            await this.conversationData.set(context, { endDialog: false });
            await this.BookFlightDialog.run(context, this.dialogState);
            conversationData.endDialog = await this.BookFlightDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
                await this.sendSuggestedActions(context);
            }
            break;
        case 'cancel reservation':
            console.log('Inside cancel Case');
            await this.conversationData.set(context, { endDialog: false });
            await this.CancelDialog.run(context, this.dialogState);
            conversationData.endDialog = await this.CancelDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
                await this.sendSuggestedActions(context);
            }
            break;
        case 'Info':
            console.log('Inside info Case');
            await this.conversationData.set(context, { endDialog: false });
            await this.InfoDialog.run(context, this.dialogState);
            conversationData.endDialog = await this.InfoDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
                await this.sendSuggestedActions(context);
            }
            break;

        default:
            console.log('Did not match any case');
            break;
        }
    }
}
module.exports.WEATHERBot = WEATHERBot;
