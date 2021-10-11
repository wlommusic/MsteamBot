const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');

const { ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt } = require('botbuilder-dialogs');

const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
let endDialog = '';

class CheckWeatherDialog extends ComponentDialog {
    constructor(conservsationState, userState) {
        super('CheckWeatherDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this), // Ask confirmation if user wants to make reservation?
            this.getName.bind(this), // Get name from user
            this.getDate.bind(this), // Date of reservation
            this.getTime.bind(this), // Time of reservation
            this.confirmStep.bind(this), // Show summary of values entered by user and ask confirmation to make reservation
            this.summaryStep.bind(this)

        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async firstStep(step) {
        endDialog = false;
        return await step.prompt(CONFIRM_PROMPT, 'would you like to go ahead?', ['yes', 'no']);
    }

    async getName(step) {
        if (step.result === true) {
            return await step.prompt(TEXT_PROMPT, 'what is your name?');
        }
        if (step.result === false) {
            await step.context.sendActivity('you choose no');
            endDialog = true;
            return await step.endDialog();
        }
    }

    async getDate(step) {
        step.values.name = step.result;
        return await step.prompt(DATETIME_PROMPT, 'Enter the date');
    }

    async getTime(step) {
        step.values.date = step.result;
        return await step.prompt(DATETIME_PROMPT, 'Enter the time');
    }

    async confirmStep(step) {
        step.values.time = step.result;
        const msg = `verify your entered details: \n Name:${ step.values.name }\n Date:${ JSON.stringify(step.values.date) }\n Time:${ JSON.stringify(step.values.time) }`;
        await step.context.sendActivity(msg);
        return await step.prompt(CONFIRM_PROMPT, 'would you like to go ahead?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result === true) {
            // logic
            await step.context.sendActivity('sucessfull !!');
            endDialog = true;
            return await step.endDialog();
        }
        if (step.result === false) {
            await step.context.sendActivity('you choose no');
            endDialog = true;
            return await step.endDialog();
        }
    }

    async isDialogComplete() {
        return await endDialog;
    }
}

module.exports.CheckWeatherDialog = CheckWeatherDialog;
