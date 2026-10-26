import type {Request} from 'express';

export function pageParams(req:Request){
  if(req.query.page===undefined&&req.query.pageSize===undefined)return null;
  const page=Number(req.query.page??1),pageSize=Number(req.query.pageSize??25);
  if(!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw Object.assign(new Error('Paginación inválida.'),{status:400});
  return {page,pageSize};
}
