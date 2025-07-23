const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const dbpath = path.join(__dirname, 'covid19India.db')
const app = express() 
const jwt = require("jsonwebtoken")
let db = null
app.use(express.json())
initilizingDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('the server is running at https://localhost:3000')
    })
  } catch (err) {
    console.log(`DB Error ${err} `)
  }
}
initilizingDBAndServer()
//login user 
app.post("/login/" , async(req,res)=>{
   const {username,password} = req.body; 
   console.log(username , password)   
   try{
       const userValidity = `
          select 
           * 
          from user 
          where 
          username = '${username}'
       ` 
       const dbresponse = await db.get(userValidity)
       if(dbresponse !== undefined){
          const payload ={
             username:username
          } 
         const jwtToken=  jwt.sign(payload,"MY_SECRET_KEY") 
         res.send({jwtToken})
       } 
       else{
         res.status(400).send("invalid user login")   
       }
   } 
   catch(err){
     console.log(err.msg)
   }
})

const authenticationToken = async(req,res,next)=>{
   try{
       let jwtToken; 
       let authHeaders = req.headers["authorization"] 
       if(authHeaders !== undefined){
         jwtToken = authHeaders.split(" ")[1]
       } 
       if(authHeaders === undefined){
         res.status(400).send("Invalid token access")
       } 
       else{
         jwt.verify(jwtToken,"MY_SECRET_TOKEN",async (payload,error)=>{
              console.log(jwtToken)
              if(error){
                 res.status(400).send("INVALID JWTTOKEN")
              } 
              else{ 
                req.username = payload.username
                 next()
              }
         })
       }
   } 
   catch(err){
     console.log(err.msg)
   }
}



//1)Returns a list of all states in the state table
const convertTheFormat=(eachState)=>{ 
    console.log(eachState)
   return{
       stateId:eachState.state_id, 
       stateName:eachState.state_name , 
        population: eachState.population,
   }
}
app.get('/states/',authenticationToken, async (req, res) => {
  const getStatesQuery = `
     select 
       * 
       from 
       state 
   `
  const dbresponse = await db.all(getStatesQuery)
  res.send(
     dbresponse.map(eachState=>{
      return  convertTheFormat(eachState)
     })
  )
})

//2 get the specified  state using the get /states/:stateId/
app.get('/states/:stateId/', async (req, res) => {
  const {stateId} = req.params
  const getSingleStateQuery = `
     select 
     * 
     from 
     state 
     where state_id = ${stateId}
   `
  const dbresponse = await db.get(getSingleStateQuery)
  res.send({stateId:dbresponse.state_id , stateName:dbresponse.state_name , population:dbresponse.population})
})

//3 posting the district data in the district table
app.post('/districts/', async (req, res) => {
  const userRequestDetails = req.body
  const {districtName, stateId, cases, cured, active, deaths} =
    userRequestDetails
  const creatingTheNewDistrict = `
     INSERT INTO 
     district  ( district_name , 
      state_id,
      cases ,
      cured ,
      active ,
      deaths)
     values( "${districtName}", 
      ${stateId},
      ${cases} ,
      ${cured},
     ${active},
      ${deaths}) 
    `
  await db.run(creatingTheNewDistrict)
  res.send('District Successfully Added')
})

//4 getting the district from the district table /districts/:districtId/
app.get('/districts/:districtId/', async (req, res) => {
  const {districtId} = req.params
  const gettingTheSingleDistrict = `  
     select 
     * 
     from 
     district 
     where 
     district_id = ${districtId}
   `
  const dbresponse = await db.get(gettingTheSingleDistrict)
  res.send(dbresponse)
})

//5 deleting the district from the database /districts/:districtId/
app.delete('/districts/:districtId/', async (req, res) => {
  const {districtId} = req.params
  const deleteDistrictQuery = `

     delete 
     from 
     district 
     where 
     district_id = ${districtId}

   `
  await db.run(deleteDistrictQuery)
  res.send('District Removed')
})

//6 updating the district form the specified id of the district /districts/:districtId/
app.put('/districts/:districtId/', async (req, res) => {
  const {districtId} = req.params
  const userRequest = req.body
  const {districtName, stateId, cases, cured, active, deaths} = userRequest
  const updateDistrictQuery = `
    update
    district 
    set 
     district_name = "${districtName}", 
    state_id = ${stateId} , 
    cases = ${cases} , 
      cured = ${cured}, 
     active = ${active} , 
       deaths = ${deaths}  

    where 
    district_id = ${districtId}

  `
  await db.run(updateDistrictQuery)
  res.send('District Details Updated')
})

//7 getting the details infromation fro the specified state /states/:stateId/stats/
app.get('/states/:stateId/stats/', async (req, res) => {
  const {stateId} = req.params
  const gettingStateQuery = `
     select 
     SUM(district.cases) AS totalCases ,  
     SUM(district.cured) AS totalCured, 
     SUM(district.active) AS totalActive, 
     SUM(district.deaths) AS totalDeaths
     from 
     state    
     INNER JOIN 
     district 
     on 
     state.state_id = district.state_id 
     where 
     state.state_id = ${stateId}
   `
  const dbresponse = await db.get(gettingStateQuery)
  res.send({
     totalCases:dbresponse.totalCases, 
     totalCured:dbresponse.totalCured, 
     totalActive:dbresponse.totalActive, 
     totalDeaths:dbresponse.totalDeaths
  })
})


// getting the state from the given district id
app.get('/districts/:districtId/details/', async (req, res) => {
  const {districtId} = req.params
  const getStateNamequery = `
    select   
    * 
    from district 
    INNER JOIN 
    state 
    ON district.state_id = state.state_id 
    where 
    district.district_id = ${districtId}

   `
  const dbresponse = await db.get(getStateNamequery)
  res.send(dbresponse.state_name)
})
module.exports = app   



