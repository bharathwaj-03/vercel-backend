import express from "express";
import mongoose from "mongoose";
import { Staff, User } from "./models/attendance.js";
import { TimeTable } from "./models/attendance.js";
import { Holiday } from "./models/attendance.js";
import { AcademicEvent } from "./models/attendance.js";
import { Student } from "./models/attendance.js";
import { Attendance } from "./models/attendance.js";
import PDFDocument from 'pdfkit';


import cors from "cors";

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/attendance")
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));
  app.use((req, res, next) => {
    res.header('Content-Type', 'application/json');
    next();
  });
  

// Add this to your server.js or routes file
app.get("/academic-calendar", async(req, res) => {
  try {
    // Always set content type header
    res.setHeader('Content-Type', 'application/json');
    
    const events = await AcademicEvent.find({});
    const holidays = await Holiday.find({});
    
    // Don't check if events/holidays are null - find() returns an empty array
    console.log(`Found ${events.length} events and ${holidays.length} holidays`);
    
    return res.json({
      success: true,
      events: events,
      holidays: holidays
    });
  } catch (error) {
    console.error("Academic events error:", error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message
    });
  }
});





// Login endpoint
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ name: username });

    if (!user) {
      return res.json({ success: false, message: "Invalid username or password" });
    }

    // Check if the user is staff
    if (user.role === "staff") {
      return res.json({ success: false, message: "Staff details not allowed" });
    }

    // Simple password check
    if (user.password === password) {
      // Create a safe user object without the password
      const safeUser  = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dob: user.dob,
        studentId: user.studentId,
        staffId: user.staffId,
        courses:user.courses
      };
      return res.json({ success: true, user: safeUser  });
    }

    return res.json({ success: false, message: "Invalid username or password" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/loginstaff", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ name: username });

    if (!user) {
      return res.json({ success: false, message: "Invalid username or password" });
    }

    // Check if the user is staff
    if (user.role === "student") {
      return res.json({ success: false, message: "Student details not allowed" });
    }

    // Simple password check
    if (user.password === password) {
      // Create a safe user object without the password
      const safeUser  = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dob: user.dob,
        studentId: user.studentId,
        staffId: user.staffId,
        course:user.course
      };
      return res.json({ success: true, user: safeUser  });
    }

    return res.json({ success: false, message: "Invalid username or password" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/getstaff",async(req,res)=>{
  try{
    const result=await Staff.find({});
    if(!result){
      console.log("Staffs not found");
      return res.status(400).json({success:false,message:"Staffs details not found"});

    }
    return res.json({success:true,staffs:result});
  }

  catch (error) {
    console.error("Server error fetching staff details:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error staff: " + error.message 
    });
  }
});

app.get("/getTimeTable", async (req, res) => {
  try {
    const day = req.query.day;
    
    if (!day) {
      console.log("day not found");
      return res.status(400).json({ success: false, message: "Day parameter is required" });
    }

   
    
    // Make sure the day matches exactly what's in your database (case-sensitive)
    const timetable = await TimeTable.findOne({ day: day });
    
    if (!timetable) {
      console.log("No timetable found for day:", day);
      return res.json({ 
        success: false, 
        message: `No timetable found for ${day}`,
        timetable: null 
      });
    }
    
  
    
    // Return the complete timetable - don't try to create a new object
    return res.json({ 
      success: true, 
      timetable: timetable
    });
  } 
  catch (error) {
    console.error("Server error fetching timetable:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error: " + error.message 
    });
  }
});
app.post("/getclasses", async (req, res) => {
  try {
    const { staffname } = req.body;

    const classes = await TimeTable.aggregate([
      {
        $match: {
          day: { $in: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
          "periods.staffName": staffname
        }
      },
      {
        $project: {
          day: 1,
          date: 1,
          periods: {
            $filter: {
              input: "$periods",
              as: "period",
              cond: { $eq: ["$$period.staffName", staffname] }
            }
          }
        }
      }
    ]);

    if (!classes || classes.length === 0) {
      console.log("No classes found");
      return res.json({ success: false, message: "No classes found" });
    }

    console.log("Classes Found Successfully:", classes);
    return res.json({ success: true, classes: classes });

  } catch (error) {
    console.error("Server error fetching classes:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error: " + error.message 
    });
  }
});

app.post("/loadStaffs",async (req,res)=>{
  try{
    const {staffname}=req.body;

    const staffs=await Staff.findOne({name:staffname});
  
    if(!staffs){
      return res.json({success:false,message:"Invalid staffname"});
    }
  
    return res.json({success:true,staffs:staffs});
  }  catch (error) {
    console.error("Error fetching extra staffs:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }

})


app.post("/changePassword", async (req, res) => {
  const { username, password, newPassword } = req.body;
  const user = await User.findOne({ name: username });
  
  if (!user) {
    return res.json({ success: false, message: "Invalid username" });
  }

  // Directly compare the provided password with the stored password
  if (username === user.name) {
    // Update the password directly
    User.updateOne({ name: username }, { password: newPassword })
      .then(() => {
        res.json({ success: true, message: "Password changed successfully" });
      })
      .catch(err => {
        console.error(err);
        res.json({ success: false, message: "Error changing password" });
      });
  } else {
    return res.json({ success: false, message: "Current password is incorrect" });
  }
});
// Add this endpoint to your server.js file

// Get all users endpoint
app.get("/allusers", async (req, res) => {
  try {
    // Find all users
    const users = await Student.find({});
    
    // Create safe user objects without passwords
 
    return res.json({ success: true, users:users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/setDate", async (req, res) => {
  const { newDate } = req.body;
  try {
    const result = await Attendance.updateMany(
      { dept: "CSE" },
      { $set: { date: new Date(newDate) } } // Ensuring it's a Date object
    );

    return res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error updating date:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});







// Route to submit attendance

app.post('/submit-attendance', async (req, res) => {
  try {
    const { attendanceData } = req.body;
    
    if (!attendanceData || !Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid attendance data' 
      });
    }

    console.log('Received attendance data:', JSON.stringify(attendanceData, null, 2));
    let updatedCount = 0;

    // Process each student's attendance
    for (const record of attendanceData) {
      const { date, studentName, staffName, subject, status } = record;
      console.log("Student record: ",record);
      
      console.log(`Processing attendance for ${studentName}, ${subject}, status: ${status}`);
      
      // Convert date string to Date object if needed
      const dateObj = new Date(date);
      // Format the date to midnight for consistent comparison
      const formattedDate = new Date(dateObj.setHours(0, 0, 0, 0));
      
      // Use MongoDB's direct update operation with the $ positional operator
      const result = await Attendance.updateOne(
        {
          date: {
            $gte: new Date(formattedDate.setHours(0, 0, 0, 0)),
            $lt: new Date(formattedDate.setHours(23, 59, 59, 999))
          },
          studentName: studentName,
          "records.staffName": staffName,
          "records.subject": subject
        },
        {
          $push: {
            "records.$.status": status
          }
        }
      );

      console.log(`Update result: ${JSON.stringify(result, null, 2)}`);
      
      if (result.matchedCount === 0) {
        console.log(`No matching record found for ${studentName}, ${staffName}, ${subject}`);
      } else if (result.modifiedCount === 0) {
        console.log(`Record found but not modified for ${studentName}, ${staffName}, ${subject}`);
      } else {
        console.log(`Successfully updated status for ${studentName}, ${staffName}, ${subject}`);
        updatedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Attendance submitted successfully. Updated ${updatedCount} records.`
    });
  } catch (error) {
    console.error('Error submitting attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Error saving attendance data',
      error: error.message
    });
  }
});


// Add this endpoint to your Express server
app.get("/getAttendanceReport", async (req, res) => {
  try {
    const { studentName } = req.query;

    if (!studentName) {
      return res.status(400).json({
        success: false,
        message: "Student name is required"
      });
    }

    // Find all attendance records for this student
    const attendanceRecords = await Attendance.find({ studentName });

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found for this student"
      });
    }

    // Process the records to calculate staff-wise statistics
    const staffStats = {};

    // Process each attendance record
    attendanceRecords.forEach(record => {
      record.records.forEach(staffRecord => {
        const { staffName, subject, status } = staffRecord;
        
        // Initialize staff record if not exists
        if (!staffStats[staffName]) {
          staffStats[staffName] = {
            subject,
            totalHours: 0,
            attendedHours: 0,
            percentage: 0
          };
        }
    //    console.log("staffStats: ",staffStats);

        // Update statistics
        const totalClassesForStaff = status.length;
        const attendedClasses = status.filter(s => s === 'present').length;

        staffStats[staffName].totalHours += totalClassesForStaff;
        staffStats[staffName].attendedHours += attendedClasses;
      });
    });

    // Calculate percentages
    Object.keys(staffStats).forEach(staffName => {
      const stats = staffStats[staffName];
      stats.percentage = stats.totalHours > 0 
        ? Math.round((stats.attendedHours / stats.totalHours) * 100) 
        : 0;
    });

    return res.json({
      success: true,
      studentName,
      staffStats
    });
    
  } catch (error) {
    console.error("Server error fetching attendance report:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching attendance report: " + error.message
    });
  }
});



//downlaod report




// Add this endpoint to your Express server
app.get("/downloadAttendanceReport", async (req, res) => {
  try {
    const { studentName } = req.query;

    if (!studentName) {
      return res.status(400).json({
        success: false,
        message: "Student name is required"
      });
    }

    // Find all attendance records for this student
    const attendanceRecords = await Attendance.find({ studentName });

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found for this student"
      });
    }

    // Process the records to calculate staff-wise statistics
    const staffStats = {};

    // Process each attendance record
    attendanceRecords.forEach(record => {
      record.records.forEach(staffRecord => {
        const { staffName, subject, status } = staffRecord;
        
        // Initialize staff record if not exists
        if (!staffStats[staffName]) {
          staffStats[staffName] = {
            subject,
            totalHours: 0,
            attendedHours: 0,
            percentage: 0
          };
        }

        // Update statistics
        const totalClassesForStaff = status.length;
        const attendedClasses = status.filter(s => s === 'present').length;

        staffStats[staffName].totalHours += totalClassesForStaff;
        staffStats[staffName].attendedHours += attendedClasses;
      });
    });

    // Calculate percentages
    Object.keys(staffStats).forEach(staffName => {
      const stats = staffStats[staffName];
      stats.percentage = stats.totalHours > 0 
        ? Math.round((stats.attendedHours / stats.totalHours) * 100) 
        : 0;
    });

    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${studentName.replace(/\s+/g, '_')}.pdf`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to the PDF
    
    // Header
    doc.fontSize(25).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Student: ${studentName}`, { align: 'center' });
    doc.moveDown(2);
    
    // Current date
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.fontSize(12).text(`Generated on: ${currentDate}`, { align: 'right' });
    doc.moveDown(2);

    // Define table layout
    const tableTop = 200;
    const tableLeft = 50;
    const colWidths = [150, 120, 80, 80, 70];
    const rowHeight = 30;
    
    // Table headers
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Course', tableLeft, tableTop);
    doc.text('Faculty', tableLeft + colWidths[0], tableTop);
    doc.text('Total Hours', tableLeft + colWidths[0] + colWidths[1], tableTop);
    doc.text('Attended', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop);
    doc.text('Percent', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop);
    
    // Horizontal line after headers
    doc.moveTo(tableLeft, tableTop + 20)
       .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], tableTop + 20)
       .stroke();
    
    // Table rows
    doc.font('Helvetica').fontSize(11);
    let rowY = tableTop + 30;
    
    Object.keys(staffStats).forEach((staffName, index) => {
      const stats = staffStats[staffName];
      
      doc.text(stats.subject, tableLeft, rowY);
      doc.text(staffName, tableLeft + colWidths[0], rowY);
      doc.text(stats.totalHours.toString(), tableLeft + colWidths[0] + colWidths[1], rowY);
      doc.text(stats.attendedHours.toString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2], rowY);
      
      // Add percentage with color based on value
      if (stats.percentage >= 75) {
        doc.fillColor('green');
      } else if (stats.percentage >= 60) {
        doc.fillColor('orange');
      } else {
        doc.fillColor('red');
      }
      
      doc.text(`${stats.percentage}%`, tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowY);
      doc.fillColor('black');  // Reset color
      
      rowY += rowHeight;
      
      // Add a page break if needed
      if (rowY > 700 && index < Object.keys(staffStats).length - 1) {
        doc.addPage();
        
        // Reset row position for the new page
        rowY = 50;
        
        // Add headers to new page
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Course', tableLeft, rowY);
        doc.text('Faculty', tableLeft + colWidths[0], rowY);
        doc.text('Total Hours', tableLeft + colWidths[0] + colWidths[1], rowY);
        doc.text('Attended', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], rowY);
        doc.text('Percent', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowY);
        
        // Horizontal line after headers
        doc.moveTo(tableLeft, rowY + 20)
           .lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], rowY + 20)
           .stroke();
        
        doc.font('Helvetica').fontSize(11);
        rowY += 30;
      }
    });
    
    // Add footer with page numbers
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(10).text(`Page ${i + 1} of ${totalPages}`, 
        50, 
        doc.page.height - 50, 
        { align: 'center' }
      );
    }
    
    // Finalize the PDF and end the stream
    doc.end();
    
  } catch (error) {
    console.error("Server error generating PDF report:", error);
    return res.status(500).json({
      success: false,
      message: "Server error generating PDF report: " + error.message
    });
  }
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});