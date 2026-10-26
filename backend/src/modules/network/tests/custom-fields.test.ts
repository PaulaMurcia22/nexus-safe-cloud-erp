import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCustomFieldValues} from '../custom-field-validation.js';

const definitions=[{field_key:'rack_number',field_type:'NUMBER'},{field_key:'install_date',field_type:'DATE'},{field_key:'room',field_type:'LIST',options:['A','B']},{field_key:'owner_note',field_type:'TEXT',required:true}];
test('custom field values validate supported types and required values',()=>{
  assert.deepEqual(validateCustomFieldValues(definitions,{rack_number:3,install_date:'2026-10-22',room:'A',owner_note:'ops'}),{rack_number:3,install_date:'2026-10-22',room:'A',owner_note:'ops'});
  assert.throws(()=>validateCustomFieldValues(definitions,{rack_number:'3',room:'C'}),/inválido/);
  assert.throws(()=>validateCustomFieldValues(definitions,{rack_number:3}),/obligatorio/);
});
test('custom field required value may already exist on the asset',()=>assert.deepEqual(validateCustomFieldValues(definitions,{rack_number:4},{owner_note:'existing'}),{rack_number:4,owner_note:'existing'}));
