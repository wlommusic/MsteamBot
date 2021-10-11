const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');

const { ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt } = require('botbuilder-dialogs');

const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');
const { CardFactory } = require('botbuilder');
const flightCard = require('../resources/cards/flight.json');
const cardArr = [
    flightCard
];

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';
class CancelDialog extends ComponentDialog {
    constructor(conservsationState, userState) {
        super('CancelDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this), // Ask confirmation if user wants to make reservation?
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
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        await step.context.sendActivity({
            text: 'Enter booking id: ',
            attachments: [CardFactory.adaptiveCard(cardArr[0])]
        });
        return await step.prompt(TEXT_PROMPT, '');
    }

    async confirmStep(step) {
        step.values.id = step.result;

        var msg = ` You have entered following id: \n Name: ${ step.values.id } }`;

        await step.context.sendActivity(msg);

        return await step.prompt(CONFIRM_PROMPT, 'Are you sure that all values are correct and you want to cancel the reservation?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result === true) {
            // Business
            await step.context.sendActivity(`cancelled successfully . Your reservation id was : ${ step.values.id }`);
            endDialog = true;
            return await step.endDialog();
        }
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.CancelDialog = CancelDialog;
