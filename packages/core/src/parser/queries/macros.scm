; queries/macros.scm
; Finds #define preprocessor definitions (constants and function-like macros).

; Simple constant: #define NAME value
(preproc_def
  name: (identifier) @macro.name
  value: (_) @macro.value) @macro.def

; Function-like macro: #define NAME(args) body
(preproc_function_def
  name: (identifier) @macro_fn.name
  parameters: (preproc_params) @macro_fn.params) @macro_fn.def
