import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { RegisterUsers } from '../models/registerUsers';
import { createUsersService } from '../../../app/services/create-users.service';
import { AuthService } from 'src/app/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-gestion-usuarios',
  templateUrl: './gestion-usuarios.component.html',
  styleUrls: ['./gestion-usuarios.component.scss']
})

export class GestionUsuariosComponent implements OnInit {
  
  form: FormGroup;
  titulo = "Agregar usuario";
  id: string | undefined;

  usuarios: Observable<any[]>;
  listarUsuarios: RegisterUsers[]=[];

  Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  })
  
  constructor(
    private fb: FormBuilder,
    private _userService: createUsersService,
    private authService:AuthService,
    firestore: AngularFirestore,
  ) {
    this.usuarios = firestore.collection('usuarios').valueChanges();

    // Validaciones del formulario
    this.form = this.fb.group ({
      nombres:['',[Validators.required, Validators.minLength(3)]],
      apellidoPaterno:['',[Validators.required, Validators.minLength(3)]],
      apellidoMaterno:['',[Validators.required, Validators.minLength(3)]],
      dni:['',[Validators.required,Validators.minLength(8),Validators.maxLength(8),Validators.pattern('[0-9]*')]],
      telefono:['',[Validators.required, Validators.minLength(9), Validators.maxLength(9)]],
      estado:['',Validators.required],
      rol:['',Validators.required],
      correo:['', [Validators.required,Validators.email]],
      password:['',[Validators.required, Validators.minLength(6)]],
    })
  }

  ngOnInit(): void {
    // Función para obtener datos del formulario para luego editarlos
    this._userService.getUserEdit().subscribe(data=>{
      // Obteniendo valores del formulario segun el id del usuario
      this.id =data.id;
      this.titulo="editar usuario";
      this.form.patchValue({
        nombres:data.nombres,
        apellidoPaterno:data.apellidoPaterno,
        apellidoMaterno:data.apellidoMaterno,
        dni:data.dni,
        telefono:data.telefono,
        estado:data.estado,
        rol:data.rol,
        correo:data.correo,
        password:data.password,
      })
    })
    // LLamando a la función para obtener datos de los usuarios de firestore
    this.obtenerUsuarios();
  }

  // Cerrando el modal
  btnCerrar(){
    let modal:any = document.getElementById('btnModal');
    modal.style.display='none';
    this.form.reset();
    this.titulo="agregar usuario";
  }

  seePass(){
    const passLogin = document.querySelector('#passLogin') as HTMLInputElement
    const icon = document.querySelector('i') as HTMLElement
    if (passLogin.type === 'password') {
      passLogin.type = 'text';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
    else {
      console.log('holaaaa')
      passLogin.type = 'password';
      icon.classList.add('fa-eye-slash');
      icon.classList.remove('fa-eye');
    }
  }

  // Guardando un usuario en firestore 
  // si el id del usuario no existe entonces agrega un usuario
  // si el id del usuario existe entonces modifica los datos del usuario
  guardarUsuario() {
    console.log(this.form);
    console.log(this.form.value.correo);
    console.log('clic en boton guardar usuario');
    let modal:any = document.getElementById('btnModal');
    this.titulo="agregar usuario";
    if(this.id === undefined) {
      // Creamos una nuevo usuario
      this.agregarUsuario();
      modal.style.display='none';
    } else {
      // Editamos un usuario
      this.editarUsuario(this.id);
      modal.style.display='none';
      this.form.reset();
    }
  }

  // Se edita los datos del usuario dentro del formulario
  editarUsuario(id: string) {
    const USUARIO: any = {
      nombres: this.form.value.nombres,
      apellidoPaterno: this.form.value.apellidoPaterno,
      apellidoMaterno: this.form.value.apellidoMaterno,
      dni:this.form.value.dni,
      telefono:this.form.value.telefono,
      estado:this.form.value.estado,
      rol:this.form.value.rol,
      correo: this.form.value.correo,
      password: this.form.value.password,
      fechaActualizacion: new Date(),
    }
    
    this._userService.editarUsuario(id, USUARIO).then(() =>{
      this.id = undefined;
      console.log('El usuario fue actualizada con exito!', 'Registro Actualizado');
      this.Toast.fire({
        icon: 'success',
        title: 'Usuario editado.',
      })
      this.form.reset();
    }, error => {
      console.log(error);
      this.Toast.fire({
        icon: 'error',
        title: 'Usuario no se pudo actualizar.',
      })
    })
  }

  agregarUsuario(){
    const USUARIO: RegisterUsers = {
      dni:this.form.value.dni,
      nombres: this.form.value.nombres,
      apellidoPaterno: this.form.value.apellidoPaterno,
      apellidoMaterno: this.form.value.apellidoMaterno,
      telefono: this.form.value.telefono,
      estado:this.form.value.estado,
      rol: this.form.value.rol,
      correo: this.form.value.correo,
      password: this.form.value.password,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
    }

     //para crear un usuario por primera vez
    const {correo, password} = USUARIO;
    this.authService.register(correo, password).then(registered => {
      console.log(registered); // trae los datos de quien se registra por primera vez
      // uid es el id de quien se registra por primera vez y aparece en el auth
      this._userService.saveUser(USUARIO, registered?.user?.uid).then(()=>{
        console.log('Usuario registrado');
        this.Toast.fire({
          icon: 'success',
          title: 'Usuario regitrado.',
        })
        this.form.reset();
      },error => {
        console.log('Opps.. ocurrio un error',error);
        this.Toast.fire({
          icon: 'error',
          title: 'Opps.. ocurrio un error.',
        })
      })
    });
  }

  // Obtiene datos del usuario de coleccion users de firestore y lo guarda en un array listarusuarios
  obtenerUsuarios(){
    this._userService.getUsers().subscribe(doc=>{
      this.listarUsuarios=[];
      doc.forEach((element: any) => {
        this.listarUsuarios.push({
          id:element.payload.doc.id,
          ...element.payload.doc.data()
        });
      });
      console.log(this.listarUsuarios);
    })
  }

  eliminarUsuario(id: any){
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: 'btn btn-success',
        cancelButton: 'btn btn-danger'
      },
      buttonsStyling: false
    })
    
    swalWithBootstrapButtons.fire({
      title: '¿Está seguro que desea eliminarlo?',
      text: "¡No podrás revertirlo!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminarlo',
      cancelButtonText: 'No, cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        swalWithBootstrapButtons.fire(
          '¡Eliminado!',
          'Este usuario a sido eliminado',
          'success'
        )
        this._userService.deleteUser(id).then((res)=>{
          console.log('Registro eliminado con exito',res);
        },error=>{
          console.log(error);
        })
      } else if ( result.dismiss === Swal.DismissReason.cancel ) {
        swalWithBootstrapButtons.fire(
          'Cancelado',
          'Tu registro está a salvo :)',
          'error'
        )
      }
    })  
  }

  editarUsuarioBtn(usuario:RegisterUsers){
    console.log('Clic en el boton editar para editar');
    let modal:any = document.getElementById('btnModal');
    modal.style.display='block';
    this._userService.addUserEdit(usuario);
  }
}

