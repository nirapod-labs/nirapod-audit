; queries/enums.scm
; Finds all enum declarations (both plain enum and enum class).

(enum_specifier
  name: (type_identifier) @enum.name
  body: (enumerator_list) @enum.body) @enum.decl
