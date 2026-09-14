allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

//// Huu ni mfumo sahihi na salama wa kubadilisha Build Directory kwa Gradle 9.x
//val newBuildDir = layout.buildDirectory.dir("../../build")
//layout.buildDirectory.set(newBuildDir)
//
//subprojects {
//    val newSubprojectBuildDir = layout.buildDirectory.dir(project.name)
//    layout.buildDirectory.set(newSubprojectBuildDir)
//}
//
//// Tumeondoa evaluationDependsOn ndani ya subprojects ili kuzuia Circular Dependency kwenye Gradle 9

tasks.register<Delete>("clean") {
    delete(layout.buildDirectory)
}
