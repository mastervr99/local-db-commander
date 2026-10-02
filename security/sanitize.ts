import  { z } from 'zod';

export const list_items_schema = z.object({
    limit:z
    .number()
    .int('La limite doit être un entier')
    .min(1,{message:'la limite minimale est de 1'})
    .max(100,{message:'la limite maximale est de 100'})
    .default(20)
    .describe("Nombre maximum d'éléments à afficher par page"),
    page:z
    .number()
    .int('le numéro de page doit être un entier')
    .min(1,{message:'Il doit y avoir au minimum une page à afficher'})
    .default(1)
    .describe("Numéro de la page à afficher")
}).strict();

 export const add_item_schema = z.object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Le nom doit contenir au moins 2 caractères' })
      .max(255, { message: 'Le nom ne peut pas dépasser 255 caractères' })
      .describe("Nom du nouveau article à ajouter"),
    quantity: z
      .number()
      .int('La quantité doit être un entier')
      .min(0, { message: 'La quantité ne peut pas être négative' })
      .max(100_000, { message: 'Quantité maximale dépassée' })
      .describe("quantité du nouveau article à ajouter"),
  }).strict();


export const update_stock_schema = z.object({
    id: z
    .number()
    .int("L'ID doit être un entier")
    .positive({ message: "L'ID doit être un entier positif" })
    .describe("Id de l'article dont la quantité en stock doit être mise à jour"),
    quantity: z
      .number()
      .int('La quantité doit être un nombre entier')
      .min(0, { message: 'La quantité ne peut pas être négative' })
      .max(100_000, { message: 'Quantité maximale dépassée' })
      .describe("Nouvelle quantité de l'article à enregistrer dans l'inventaire"),
  }).strict();


export const delete_item_schema = z.object({
    id: z
    .number()
    .int("L'ID doit être un entier")
    .positive({ message: "L'ID doit être un entier positif" })
    .describe("Numéro ID de l'article dont on doit définitivement supprimer les informations dans l'inventaire"),
  }).strict(); 


export const TOOL_SCHEMAS = {
  list_items: list_items_schema,
  add_item: add_item_schema,
  update_stock: update_stock_schema,
  delete_item: delete_item_schema, 
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;

export type Tool_input<K extends ToolName = ToolName> = z.infer<typeof TOOL_SCHEMAS[K]>;

export interface sanitization_result<T = unknown>{
  success: boolean;
  data?: T;
  errors?: string[];
}

export function sanitize_input<K extends ToolName>(toolName : K, rawInput: unknown): sanitization_result<Tool_input<K>> {
  const schema = TOOL_SCHEMAS[toolName];

  if(!schema){
    return {
      success: false,
      errors: [`Outil MCP non reconnu : "${toolName}"`]
    }
  }

  const result = schema.safeParse(rawInput);

  if(!result.success){

    const formattedErrors = result.error.issues.map(
      (err) => `${err.path.length > 0 ? err.path.join('.') : 'root'}: ${err.message}`
    ); 

    return {
      success: false,
      errors: formattedErrors
    }
  }

  return {
    success: true,
    data: result.data as Tool_input<K>
  }

}