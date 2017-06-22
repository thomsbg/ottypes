L = require('./src/list')
d = [
  [["insert",0,1]],
  [["apply","register",5],["insert",8,7]],
  [["retain",1],["apply","register",6],["apply","register",1],["insert",6,6]],
  [["apply","register",2],["retain",1],["insert",7,7,7,8],["insert",7,7],["insert",8]],
  [["retain",1],["insert",6],["retain",3],["insert",9,9],["apply","register",2],["insert",9,7,4],["insert",7,4]],
  [["insert",0,1],["apply","register",7],["retain",5],["retain",3],["apply","register",0],["delete",1],["apply","register",2],["insert",2,9,7,6],["insert",7,6],["apply","register",7],["insert",2,6]],
  [["apply","register",8],["delete",4],["delete",3],["apply","register",5],["insert",3,5,7,7],["insert",7,7],["apply","register",9],["retain",10],["retain",3],["insert",4,1],["apply","register",3],["delete",1],["apply","register",7],["insert",2,5]]
]

console.log(d.slice(0, 7).reduce(L.compose))
