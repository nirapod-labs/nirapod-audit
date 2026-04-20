; queries/calls.scm
; Finds all function call expressions.

(call_expression
  function: (identifier) @call.fn
  arguments: (argument_list) @call.args) @call

; Member function call: obj.method(args)
(call_expression
  function: (field_expression
    field: (field_identifier) @call.method)
  arguments: (argument_list) @call.args) @call.member

; Scoped call: Namespace::function(args)
(call_expression
  function: (qualified_identifier) @call.qualified
  arguments: (argument_list) @call.args) @call.scoped
