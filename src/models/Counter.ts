import mongoose, { Schema, model, models } from 'mongoose';

// Used for sequential invoice number generation via atomic findOneAndUpdate
const CounterSchema = new Schema({
    _id: { type: String, required: true }, // e.g. 'invoice'
    seq: { type: Number, default: 0 },
});

const CounterModel = models.Counter || model('Counter', CounterSchema);
export default CounterModel;
