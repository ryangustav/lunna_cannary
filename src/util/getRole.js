async function getRole(user, membro) {
    if (user === null || membro === null) return false;
    const member_pos = membro.reduce((highest, current) =>
    current.rawPosition > highest ? current.rawPosition : highest, 0
   );
   
   
   const user_pos = user.reduce((highest, current) =>
    current.rawPosition > highest ? current.rawPosition : highest, 0
   );
   
   let comparation = member_pos >= user_pos ? false : true;
   return comparation
}

module.exports = getRole;