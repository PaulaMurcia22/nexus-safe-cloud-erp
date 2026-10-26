export type FieldDefinition={field_key:string;field_type:string;options?:string[]|null;required?:boolean};

export function validateCustomFieldValues(definitions:FieldDefinition[],values:Record<string,unknown>,existing:Record<string,unknown>={}){
  const byKey=new Map(definitions.map(d=>[d.field_key,d]));
  for(const [key,value] of Object.entries(values)){
    const d=byKey.get(key);if(!d)throw Object.assign(new Error(`Campo personalizado no definido o inactivo: ${key}`),{status:400});
    const dateValid=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
    const valid=d.field_type==='TEXT'?typeof value==='string':d.field_type==='NUMBER'?typeof value==='number'&&Number.isFinite(value):d.field_type==='DATE'?dateValid:d.field_type==='LIST'?typeof value==='string'&&(d.options??[]).includes(value):false;
    if(!valid)throw Object.assign(new Error(`Valor inválido para el campo ${key}`),{status:400});
  }
  const merged={...existing,...values};
  for(const d of definitions)if(d.required&&(merged[d.field_key]===undefined||merged[d.field_key]===null||merged[d.field_key]===''))throw Object.assign(new Error(`El campo ${d.field_key} es obligatorio.`),{status:400});
  return merged;
}
