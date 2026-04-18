; queries/structs.scm
; Finds all struct declarations with their name and body.

(struct_specifier
  name: (type_identifier) @struct.name
  body: (field_declaration_list) @struct.body) @struct.decl
