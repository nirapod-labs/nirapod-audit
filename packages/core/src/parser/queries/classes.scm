; queries/classes.scm
; Finds all class declarations (C++ only) with their name and body.

(class_specifier
  name: (type_identifier) @class.name
  body: (field_declaration_list) @class.body) @class.decl
