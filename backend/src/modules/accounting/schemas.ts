import { z } from 'zod';

export const id = z.string().uuid();
export const entryLine = z.object({
  accountId: id,
  description: z.string().trim().max(240).default(''),
  debit: z.number().nonnegative().max(9999999999999999),
  credit: z.number().nonnegative().max(9999999999999999),
});
export const journalEntry = z.object({
  entryDate: z.string().date(),
  description: z.string().trim().min(4).max(300),
  sourceType: z.enum(['MANUAL','SUBSCRIPTION','INVOICE','EXPENSE','PURCHASE_ORDER','PAYMENT','ADJUSTMENT']).default('MANUAL'),
  lines: z.array(entryLine).min(2).max(100),
}).superRefine((value,ctx)=>{
  const debit=value.lines.reduce((sum,line)=>sum+line.debit,0);
  const credit=value.lines.reduce((sum,line)=>sum+line.credit,0);
  if(Math.abs(debit-credit)>0.01) ctx.addIssue({code:z.ZodIssueCode.custom,message:'El asiento debe estar balanceado; débitos y créditos deben ser iguales.',path:['lines']});
  if(value.lines.some(line=>(line.debit>0)===(line.credit>0))) ctx.addIssue({code:z.ZodIssueCode.custom,message:'Cada línea debe registrar un débito o un crédito, no ambos.',path:['lines']});
});
export const accountInput = z.object({
  code:z.string().trim().min(2).max(20).regex(/^[0-9A-Za-z.-]+$/),
  name:z.string().trim().min(2).max(160),
  accountType:z.enum(['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE']),
  normalBalance:z.enum(['DEBIT','CREDIT']),
  parentId:id.nullable().optional(),
  active:z.boolean().default(true),
}).superRefine((value,ctx)=>{
  const expected=['ASSET','EXPENSE'].includes(value.accountType)?'DEBIT':'CREDIT';
  if(value.normalBalance!==expected)ctx.addIssue({code:z.ZodIssueCode.custom,message:`El tipo ${value.accountType} usa saldo normal ${expected}.`,path:['normalBalance']});
});
export const reportRange=z.object({from:z.string().date(),to:z.string().date()}).refine(v=>v.from<=v.to,{message:'El inicio debe anteceder al fin.'});
