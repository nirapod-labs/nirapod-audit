; queries/functions.scm
; Finds all function definitions (C and C++) with name and body spans.
;
; In C: function_definition → function_declarator → identifier
; In C++: also matches qualified_identifier for class::method patterns.

(function_definition
  declarator: (function_declarator
    declarator: (identifier) @fn.name)
  body: (compound_statement) @fn.body) @fn.decl

(function_definition
  declarator: (function_declarator
    declarator: (qualified_identifier) @fn.name)
  body: (compound_statement) @fn.body) @fn.decl

; Function declarations in header files (no body)
(declaration
  declarator: (function_declarator
    declarator: (identifier) @fn_decl.name
    parameters: (parameter_list) @fn_decl.params)) @fn_decl.decl
